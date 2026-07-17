import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";
import type { Precision } from "./gradient";
import {
  assignJourneyRoute,
  issueJourneyToken,
  matchesJourneySnapshot,
  parseJourneyExposure,
  readJourneyToken,
  type JourneyClaims,
} from "./journey-state";
import { getProvider } from "./providers";
import { runAgentTurn, type ProxyRequest } from "./client";
import {
  handleAdaptiveTurnRequest,
  type AdaptiveTurnRuntimeDeps,
} from "./adaptive-turn-runtime";
import { issueAcceptedAskToken, verifySubmittedTurnState } from "./adaptive-turn-state";
import {
  AttemptLifecycleError,
  createProviderAttemptLifecycle,
  type AttemptStore,
} from "./attempt-lifecycle";

export interface JourneyTurnRuntimeDeps {
  secret?: string;
  release?: string;
  exposure?: string;
  demoKey?: string;
  now: () => number;
  newJourneyId: () => string;
  newAttemptId: () => string;
  attemptStore: AttemptStore;
  fixedTransport: (request: ProxyRequest) => Promise<unknown>;
  adaptiveExchange: AdaptiveTurnRuntimeDeps["exchange"];
}

interface JourneyInput {
  subjectBrief: string;
  history: AgentHistoryItem[];
  precision: Precision;
  journeyId?: string;
  journeyToken?: string;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function isHistory(value: unknown): value is AgentHistoryItem[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const item = entry as Record<string, unknown>;
    return typeof item.questionId === "string"
      && Array.isArray(item.selectedOptionIds)
      && item.selectedOptionIds.every((id) => typeof id === "string")
      && (item.freeText === undefined || typeof item.freeText === "string");
  });
}

function parseInput(value: unknown): JourneyInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_journey_state");
  const raw = value as Record<string, unknown>;
  if (typeof raw.subjectBrief !== "string"
    || !isHistory(raw.history)
    || (raw.precision !== "simple" && raw.precision !== "standard" && raw.precision !== "detailed")
    || (raw.journeyId !== undefined && typeof raw.journeyId !== "string")
    || (raw.journeyToken !== undefined && typeof raw.journeyToken !== "string")) {
    throw new Error("invalid_journey_state");
  }
  return raw as unknown as JourneyInput;
}

function stateForDecision(
  decision: { nextQuestionId: string | null; visibleOptionIds: string[]; done: boolean },
  manifest: ReturnType<typeof buildCatalogManifest>,
): JourneyClaims["state"] {
  if (decision.done) return { kind: "done" };
  const dimension = manifest.find((item) => item.questionId === decision.nextQuestionId);
  if (!dimension) throw new Error("invalid_journey_decision");
  return {
    kind: "ask",
    questionId: dimension.questionId,
    optionIds: decision.visibleOptionIds,
    mode: dimension.mode,
    ...(dimension.maxSelections === undefined ? {} : { maxSelections: dimension.maxSelections }),
  };
}

export async function handleJourneyTurnRequest(
  request: Request,
  deps: JourneyTurnRuntimeDeps,
): Promise<Response> {
  if (request.headers.get("authorization")?.trim() !== "Bearer __demo__") {
    return json({ error: "Built-in Journey required" }, 401);
  }
  const secret = deps.secret?.trim();
  const release = deps.release?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32 || !release || !deps.demoKey) {
    return json({ error: "Journey state unavailable" }, 503);
  }
  let exposure: 0 | 10 | 50 | 100;
  try {
    exposure = parseJourneyExposure(deps.exposure);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "invalid_journey_exposure" }, 503);
  }

  let input: JourneyInput;
  try {
    input = parseInput(await request.json());
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "invalid_journey_state" }, 400);
  }
  const now = deps.now();
  let journeyId: string;
  let route: "fixed" | "adaptive";
  let adaptiveTurnToken: string | undefined;
  if (input.journeyId === undefined && input.journeyToken === undefined) {
    if (input.history.length !== 0) return json({ error: "invalid_journey_state" }, 400);
    journeyId = deps.newJourneyId();
    route = assignJourneyRoute(release, journeyId, exposure);
  } else {
    if (!input.journeyId || !input.journeyToken) return json({ error: "invalid_journey_state" }, 400);
    try {
      const claims = readJourneyToken(secret, input.journeyToken, now);
      if (claims.journeyId !== input.journeyId
        || claims.release !== release
        || claims.state.kind !== "ask"
        || input.history.length !== claims.turn + 1) {
        throw new Error("invalid_journey_state");
      }
      const prefix = input.history.slice(0, -1);
      if (!matchesJourneySnapshot(claims, input.subjectBrief, prefix, input.precision)) {
        throw new Error("invalid_journey_state");
      }
      adaptiveTurnToken = issueAcceptedAskToken({
        secret,
        subjectBrief: input.subjectBrief,
        history: prefix,
        questionId: claims.state.questionId,
        optionIds: claims.state.optionIds,
        mode: claims.state.mode,
        maxSelections: claims.state.maxSelections,
        now,
      });
      verifySubmittedTurnState(secret, {
        subjectBrief: input.subjectBrief,
        history: input.history,
        turnToken: adaptiveTurnToken,
      }, now);
      journeyId = claims.journeyId;
      route = claims.route;
    } catch {
      return json({ error: "invalid_journey_state" }, 400);
    }
  }
  const manifest = buildCatalogManifest();
  let result: {
    decision: { nextQuestionId: string | null; visibleOptionIds: string[]; done: boolean };
    diagnostics: unknown;
  };
  if (route === "adaptive") {
    let adaptiveResponse: Response;
    try {
      adaptiveResponse = await handleAdaptiveTurnRequest(new Request(request.url, {
        method: "POST",
        headers: { authorization: `Bearer ${deps.demoKey}`, "content-type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          subjectBrief: input.subjectBrief,
          history: input.history,
          precision: input.precision,
          ...(adaptiveTurnToken ? { turnToken: adaptiveTurnToken } : {}),
        }),
      }), {
        enabled: true,
        turnSecret: secret,
        now: () => now,
        exchange: deps.adaptiveExchange,
        attemptLifecycle: createProviderAttemptLifecycle({
          store: deps.attemptStore,
          newAttemptId: deps.newAttemptId,
          now: deps.now,
          journeyId,
          release,
          route,
          turn: input.history.length,
        }),
      });
    } catch (error) {
      if (error instanceof AttemptLifecycleError) return json({ error: error.code }, 503);
      throw error;
    }
    if (!adaptiveResponse.ok) return adaptiveResponse;
    result = await adaptiveResponse.json() as typeof result;
  } else {
    try {
      result = await runAgentTurn(getProvider("deepseek"), deps.demoKey, {
        manifest,
        history: input.history,
        userDescription: input.subjectBrief,
        precision: input.precision,
      }, deps.fixedTransport, {
        attemptLifecycle: createProviderAttemptLifecycle({
          store: deps.attemptStore,
          newAttemptId: deps.newAttemptId,
          now: deps.now,
          journeyId,
          release,
          route,
          turn: input.history.length,
        }),
      });
    } catch (error) {
      if (error instanceof AttemptLifecycleError) return json({ error: error.code }, 503);
      throw error;
    }
  }
  const token = issueJourneyToken({
    secret,
    journeyId,
    release,
    route,
    subjectBrief: input.subjectBrief,
    history: input.history,
    precision: input.precision,
    state: stateForDecision(result.decision, manifest),
    now,
  });
  return json({
    journey: { id: journeyId, route, token },
    decision: result.decision,
    diagnostics: result.diagnostics,
  });
}
