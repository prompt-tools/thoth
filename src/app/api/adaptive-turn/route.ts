import { NextResponse } from "next/server";
import {
  ADAPTIVE_ENDPOINT,
  ADAPTIVE_MAX_BYTES,
  buildAdaptiveProviderBody,
  buildAdaptiveTurnSnapshot,
  fallbackAdaptiveTurn,
  normalizeAdaptiveResponse,
  type AdaptiveTurnResult,
  type AdaptiveTurnSnapshot,
} from "@/lib/prompt/agent/adaptive-turn";
import {
  issueAcceptedAskToken,
  verifySubmittedTurnState,
} from "@/lib/prompt/agent/adaptive-turn-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withTurnState(result: AdaptiveTurnResult, snapshot: AdaptiveTurnSnapshot, secret: string) {
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
    }),
  };
}

export async function POST(request: Request) {
  if (process.env.ADAPTIVE_ROUTING_ENABLED !== "1") {
    return NextResponse.json({ error: "Adaptive routing disabled" }, { status: 404 });
  }

  const rawAuth = request.headers.get("authorization")?.trim() ?? "";
  const serverKey = rawAuth === "Bearer __demo__"
    ? process.env.DEMO_DEEPSEEK_KEY
    : rawAuth.startsWith("Bearer ") ? rawAuth.slice(7).trim() : "";
  if (!serverKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  const turnSecret = process.env.ADAPTIVE_TURN_SECRET?.trim();
  if (!turnSecret || Buffer.byteLength(turnSecret, "utf8") < 32) {
    return NextResponse.json({ error: "Adaptive turn state unavailable" }, { status: 503 });
  }

  const controller = new AbortController();
  const timeoutError = new Error("adaptive_turn_timeout");
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError);
    }, 30_000);
  });

  let snapshot;
  try {
    const input = await Promise.race([request.json(), deadline]);
    verifySubmittedTurnState(turnSecret, input);
    snapshot = buildAdaptiveTurnSnapshot(input);
  } catch (error) {
    clearTimeout(timer!);
    if (error === timeoutError) {
      return NextResponse.json({ error: timeoutError.message }, { status: 408 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }

  if (snapshot.eligibleDimensions.length === 0) {
    clearTimeout(timer!);
    if (!snapshot.completionEligible) {
      return NextResponse.json({ error: "no_safe_adaptive_turn" }, { status: 409 });
    }
    return NextResponse.json({
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
    clearTimeout(timer!);
    return NextResponse.json({ error: "history_budget_exhausted" }, { status: 409 });
  }

  const providerBody = buildAdaptiveProviderBody(snapshot);
  const serialized = JSON.stringify(providerBody);
  if (Buffer.byteLength(serialized, "utf8") > ADAPTIVE_MAX_BYTES) {
    clearTimeout(timer!);
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  try {
    const upstream = await Promise.race([fetch(ADAPTIVE_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${serverKey}`, "content-type": "application/json" },
      body: serialized,
      redirect: "error",
      signal: controller.signal,
    }), deadline]);
    const bytes = await Promise.race([upstream.arrayBuffer(), deadline]);
    if (bytes.byteLength > ADAPTIVE_MAX_BYTES) {
      return NextResponse.json(withTurnState(fallbackAdaptiveTurn(snapshot, "response_too_large"), snapshot, turnSecret));
    }
    if (!upstream.ok) {
      return NextResponse.json(withTurnState(fallbackAdaptiveTurn(snapshot, `http_${upstream.status}`), snapshot, turnSecret));
    }
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return NextResponse.json(withTurnState(fallbackAdaptiveTurn(snapshot, "invalid_json"), snapshot, turnSecret));
    }
    return NextResponse.json(withTurnState(normalizeAdaptiveResponse(raw, snapshot), snapshot, turnSecret));
  } catch (error) {
    const reason = error === timeoutError
      ? timeoutError.message
      : error instanceof Error ? error.name : "network_error";
    return NextResponse.json(withTurnState(fallbackAdaptiveTurn(snapshot, reason), snapshot, turnSecret));
  } finally {
    clearTimeout(timer!);
  }
}
