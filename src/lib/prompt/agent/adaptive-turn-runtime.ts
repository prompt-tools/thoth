import {
  ADAPTIVE_ENDPOINT,
  ADAPTIVE_MAX_BYTES,
  buildAdaptiveProviderBody,
  buildAdaptiveTurnSnapshot,
  fallbackAdaptiveTurn,
  normalizeAdaptiveResponse,
  type AdaptiveTurnResult,
  type AdaptiveTurnSnapshot,
} from "./adaptive-turn";
import {
  issueAcceptedAskToken,
  verifySubmittedTurnState,
} from "./adaptive-turn-state";
import type { ProviderAttemptLifecycle } from "./attempt-lifecycle";

export interface AdaptiveProviderRequest {
  endpoint: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  redirect: "error";
  signal: AbortSignal;
}

export type AdaptiveProviderOutcome =
  | {
      kind: "http";
      status: number;
      headers: Record<string, string>;
      body: Uint8Array;
      bodyTooLarge?: boolean;
    }
  | {
      kind: "network";
      reason: "adaptive_turn_timeout" | "provider_cancelled" | "network_error";
    };

export interface AdaptiveTurnEvidence {
  providerStatus?: number;
  rawBody?: Uint8Array;
  finishReason?: unknown;
  toolArgumentsRaw?: unknown;
  failureCode?: string;
}

export interface AdaptiveTurnRuntimeDeps {
  enabled: boolean;
  demoKey?: string;
  turnSecret?: string;
  now: () => number;
  exchange: (request: AdaptiveProviderRequest) => Promise<AdaptiveProviderOutcome>;
  onEvidence?: (evidence: AdaptiveTurnEvidence) => void;
  attemptLifecycle?: ProviderAttemptLifecycle;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function emitEvidence(deps: AdaptiveTurnRuntimeDeps, evidence: AdaptiveTurnEvidence): void {
  try {
    deps.onEvidence?.(evidence);
  } catch {
    // Evidence collection must never change the user-visible routing result.
  }
}

function providerEvidence(raw: unknown): Pick<AdaptiveTurnEvidence, "finishReason" | "toolArgumentsRaw"> {
  const choice = (raw as {
    choices?: Array<{
      finish_reason?: unknown;
      message?: { tool_calls?: Array<{ function?: { arguments?: unknown } }> };
    }>;
  })?.choices?.[0];
  return {
    finishReason: choice?.finish_reason,
    toolArgumentsRaw: choice?.message?.tool_calls?.[0]?.function?.arguments,
  };
}

function providerUsage(raw: unknown): { promptTokens?: number; completionTokens?: number } | undefined {
  const usage = (raw as {
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
  })?.usage;
  if (!usage) return undefined;
  const tokenCount = (value: unknown): number | undefined => (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined
  );
  const promptTokens = tokenCount(usage.prompt_tokens);
  const completionTokens = tokenCount(usage.completion_tokens);
  if (promptTokens === undefined && completionTokens === undefined) return undefined;
  return { promptTokens, completionTokens };
}

function withTurnState(
  result: AdaptiveTurnResult,
  snapshot: AdaptiveTurnSnapshot,
  secret: string,
  now: number,
): AdaptiveTurnResult {
  const questionId = result.decision.nextQuestionId;
  if (result.decision.done || !questionId) return result;
  const dimension = snapshot.eligibleDimensions.find((item) => item.questionId === questionId);
  if (!dimension) throw new Error("invalid_adaptive_decision");
  return {
    ...result,
    turnToken: issueAcceptedAskToken({
      secret,
      subjectBrief: snapshot.subjectBrief,
      history: snapshot.history,
      questionId,
      optionIds: result.decision.visibleOptionIds,
      mode: dimension.mode,
      maxSelections: dimension.maxSelections,
      now,
    }),
  };
}

export async function handleAdaptiveTurnRequest(
  request: Request,
  deps: AdaptiveTurnRuntimeDeps,
): Promise<Response> {
  if (!deps.enabled) return json({ error: "Adaptive routing disabled" }, 404);

  const rawAuth = request.headers.get("authorization")?.trim() ?? "";
  const serverKey = rawAuth === "Bearer __demo__"
    ? deps.demoKey
    : rawAuth.startsWith("Bearer ") ? rawAuth.slice(7).trim() : "";
  if (!serverKey) return json({ error: "Missing API key" }, 401);
  const turnSecret = deps.turnSecret?.trim();
  if (!turnSecret || Buffer.byteLength(turnSecret, "utf8") < 32) {
    return json({ error: "Adaptive turn state unavailable" }, 503);
  }

  const now = deps.now();
  const controller = new AbortController();
  const callerSignal = request.signal;
  let callerCancelled = callerSignal?.aborted ?? false;
  const abortFromCaller = () => {
    callerCancelled = true;
    controller.abort();
  };
  if (callerCancelled) controller.abort();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutError = new Error("adaptive_turn_timeout");
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(timeoutError);
    }, 30_000);
  });

  try {
    let snapshot: AdaptiveTurnSnapshot;
    try {
      const input = await Promise.race([request.json(), deadline]);
      verifySubmittedTurnState(turnSecret, input, now);
      snapshot = buildAdaptiveTurnSnapshot(input);
    } catch (error) {
      if (timedOut || error === timeoutError) {
        return json({ error: "adaptive_turn_timeout" }, 408);
      }
      return json({ error: error instanceof Error ? error.message : "invalid_request" }, 400);
    }

    if (snapshot.eligibleDimensions.length === 0) {
      if (!snapshot.completionEligible) {
        return json({ error: "no_safe_adaptive_turn" }, 409);
      }
      return json({
        decision: {
          nextQuestionId: null,
          questionText: null,
          helperText: null,
          visibleOptionIds: [],
          done: true,
        },
        diagnostics: { source: "remainingEmpty" },
      });
    }
    if (snapshot.budget.remaining < 1) {
      return json({ error: "history_budget_exhausted" }, 409);
    }

    const serialized = JSON.stringify(buildAdaptiveProviderBody(snapshot));
    if (Buffer.byteLength(serialized, "utf8") > ADAPTIVE_MAX_BYTES) {
      emitEvidence(deps, { failureCode: "request_too_large" });
      return json({ error: "request_too_large" }, 413);
    }

    const attempt = await deps.attemptLifecycle?.start();
    let outcome: AdaptiveProviderOutcome;
    try {
      outcome = await Promise.race([
        deps.exchange({
          endpoint: ADAPTIVE_ENDPOINT,
          method: "POST",
          headers: {
            authorization: `Bearer ${serverKey}`,
            "content-type": "application/json",
          },
          body: serialized,
          redirect: "error",
          signal: controller.signal,
        }),
        deadline,
      ]);
    } catch (error) {
      const reason = timedOut || error === timeoutError
        ? "adaptive_turn_timeout"
        : callerCancelled ? "provider_cancelled" : "network_error";
      if (attempt) {
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: reason,
        });
      }
      emitEvidence(deps, { failureCode: reason });
      return json(withTurnState(fallbackAdaptiveTurn(snapshot, reason), snapshot, turnSecret, now));
    }

    if (outcome.kind === "network") {
      if (attempt) {
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: outcome.reason,
        });
      }
      emitEvidence(deps, { failureCode: outcome.reason });
      return json(withTurnState(fallbackAdaptiveTurn(snapshot, outcome.reason), snapshot, turnSecret, now));
    }

    const baseEvidence = { providerStatus: outcome.status, rawBody: outcome.body };
    if (outcome.bodyTooLarge || outcome.body.byteLength > ADAPTIVE_MAX_BYTES) {
      if (attempt) {
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: "response_too_large",
          providerStatus: outcome.status,
        });
      }
      emitEvidence(deps, { ...baseEvidence, failureCode: "response_too_large" });
      return json(withTurnState(
        fallbackAdaptiveTurn(snapshot, "response_too_large"),
        snapshot,
        turnSecret,
        now,
      ));
    }
    if (outcome.status < 200 || outcome.status >= 300) {
      const reason = `http_${outcome.status}`;
      if (attempt) {
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: reason,
          providerStatus: outcome.status,
        });
      }
      emitEvidence(deps, { ...baseEvidence, failureCode: reason });
      return json(withTurnState(fallbackAdaptiveTurn(snapshot, reason), snapshot, turnSecret, now));
    }

    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(outcome.body));
    } catch {
      if (attempt) {
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: "invalid_json",
          providerStatus: outcome.status,
        });
      }
      emitEvidence(deps, { ...baseEvidence, failureCode: "invalid_json" });
      return json(withTurnState(fallbackAdaptiveTurn(snapshot, "invalid_json"), snapshot, turnSecret, now));
    }
    const result = normalizeAdaptiveResponse(raw, snapshot);
    if (attempt) {
      if (result.diagnostics.source === "fallback") {
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "failure",
          failureCode: result.diagnostics.reason ?? "invalid_response",
          providerStatus: outcome.status,
        });
      } else {
        const usage = providerUsage(raw);
        await deps.attemptLifecycle!.finish(attempt, {
          outcome: "success",
          validation: result.decision.done ? "completion" : "ask",
          ...(usage === undefined ? {} : { usage }),
        });
      }
    }
    emitEvidence(deps, {
      ...baseEvidence,
      ...providerEvidence(raw),
      ...(result.diagnostics.source === "fallback" ? { failureCode: result.diagnostics.reason } : {}),
    });
    return json(withTurnState(result, snapshot, turnSecret, now));
  } finally {
    clearTimeout(timer!);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
