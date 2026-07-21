import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";
import type { Precision } from "./gradient";
import {
  assignRawContentSample,
  assignJourneyRoute,
  deriveJourneyId,
  issueJourneyToken,
  matchesJourneySnapshot,
  parseJourneyExposure,
  RAW_CONTENT_CONSENT_VERSION,
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
import {
  RAW_CONTENT_RETENTION_MS,
  extractProviderDiagnosticContent,
  type ProviderDiagnosticContent,
  type RawContentStore,
} from "./raw-content-store";

export interface JourneyTurnRuntimeDeps {
  secret?: string;
  release?: string;
  exposure?: string;
  demoKey?: string;
  now: () => number;
  newAttemptId: () => string;
  attemptStore: AttemptStore;
  fixedTransport: (request: ProxyRequest) => Promise<unknown>;
  adaptiveExchange: AdaptiveTurnRuntimeDeps["exchange"];
  rawContentStore?: RawContentStore;
  rawContentSamplingEnabled?: boolean;
  scheduleAfterResponse?: (task: () => Promise<void>) => void;
}

interface JourneyInput {
  subjectBrief: string;
  history: AgentHistoryItem[];
  precision: Precision;
  journeyRequestId?: string;
  journeyId?: string;
  journeyToken?: string;
  rawContentConsent?: boolean;
  complete?: boolean;
}

const MAX_JOURNEY_REQUEST_BYTES = 65_536;

async function readRequestJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength)
    && Number(declaredLength) > MAX_JOURNEY_REQUEST_BYTES) {
    throw new Error("journey_request_too_large");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("empty request body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_JOURNEY_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("journey_request_too_large");
    }
    chunks.push(value);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  return parsed;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function isHistory(value: unknown): value is AgentHistoryItem[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const item = entry as Record<string, unknown>;
    return Object.keys(item).every((key) => (
      key === "questionId" || key === "selectedOptionIds" || key === "freeText"
    ))
      && typeof item.questionId === "string"
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
    || (raw.journeyRequestId !== undefined && typeof raw.journeyRequestId !== "string")
    || (raw.journeyId !== undefined && typeof raw.journeyId !== "string")
    || (raw.journeyToken !== undefined && typeof raw.journeyToken !== "string")
    || (raw.rawContentConsent !== undefined && typeof raw.rawContentConsent !== "boolean")
    || (raw.complete !== undefined && typeof raw.complete !== "boolean")) {
    throw new Error("invalid_journey_state");
  }
  return {
    subjectBrief: raw.subjectBrief,
    history: raw.history,
    precision: raw.precision,
    ...(raw.journeyRequestId === undefined ? {} : { journeyRequestId: raw.journeyRequestId }),
    ...(raw.journeyId === undefined ? {} : { journeyId: raw.journeyId }),
    ...(raw.journeyToken === undefined ? {} : { journeyToken: raw.journeyToken }),
    ...(raw.rawContentConsent === undefined ? {} : { rawContentConsent: raw.rawContentConsent }),
    ...(raw.complete === undefined ? {} : { complete: raw.complete }),
  };
}

function isJourneyRequestId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isCanonicalCompletionExtension(
  claims: JourneyClaims,
  input: JourneyInput,
  manifest: ReturnType<typeof buildCatalogManifest>,
): boolean {
  if (input.history.length < claims.turn) return false;
  const prefix = input.history.slice(0, claims.turn);
  if (!matchesJourneySnapshot(claims, input.subjectBrief, prefix, input.precision)) return false;
  const seen = new Set(prefix.map((item) => item.questionId));
  for (const item of input.history.slice(claims.turn)) {
    const dimension = manifest.find((candidate) => candidate.questionId === item.questionId);
    const uniqueIds = new Set(item.selectedOptionIds);
    const hasFreeText = item.freeText !== undefined;
    if (!dimension
      || seen.has(item.questionId)
      || uniqueIds.size !== item.selectedOptionIds.length
      || item.selectedOptionIds.some((id) => !dimension.options.some((option) => option.id === id))
      || (hasFreeText && (!item.freeText?.trim() || item.selectedOptionIds.length > 0))
      || (dimension.mode === "single" && item.selectedOptionIds.length > 1)
      || (dimension.maxSelections !== undefined && item.selectedOptionIds.length > dimension.maxSelections)) {
      return false;
    }
    seen.add(item.questionId);
  }
  return true;
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
    input = parseInput(await readRequestJson(request));
  } catch (error) {
    const code = error instanceof Error && error.message === "journey_request_too_large"
      ? error.message
      : "invalid_journey_state";
    return json({ error: code }, code === "journey_request_too_large" ? 413 : 400);
  }
  const now = deps.now();
  let journeyId: string;
  let route: "fixed" | "adaptive";
  let consent: JourneyClaims["consent"] = null;
  let rawContentSampled = false;
  let adaptiveTurnToken: string | undefined;
  const manifest = buildCatalogManifest();
  if (input.journeyToken === undefined) {
    const requestId = input.journeyRequestId ?? input.journeyId;
    if (input.history.length !== 0
      || input.complete === true
      || !requestId
      || (input.journeyRequestId !== undefined && input.journeyId !== undefined)
      || !isJourneyRequestId(requestId)) {
      return json({ error: "invalid_journey_state" }, 400);
    }
    journeyId = deriveJourneyId({
      secret,
      release,
      requestId,
      subjectBrief: input.subjectBrief,
      precision: input.precision,
      rawContentConsent: input.rawContentConsent === true,
    });
    route = assignJourneyRoute(release, journeyId, exposure);
    consent = input.rawContentConsent === true
      ? { version: RAW_CONTENT_CONSENT_VERSION, acceptedAt: now }
      : null;
    rawContentSampled = consent !== null && assignRawContentSample(secret, release, journeyId);
  } else {
    if (!input.journeyId
      || input.journeyRequestId !== undefined
      || input.rawContentConsent !== undefined) {
      return json({ error: "invalid_journey_state" }, 400);
    }
    try {
      const claims = readJourneyToken(secret, input.journeyToken, now);
      if (claims.journeyId !== input.journeyId || claims.release !== release) {
        throw new Error("invalid_journey_state");
      }
      if (input.complete === true) {
        if ((claims.state.kind === "ask" && claims.turn === 0 && input.history.length === 0)
          || !isCanonicalCompletionExtension(claims, input, manifest)) {
          throw new Error("invalid_journey_state");
        }
        const token = claims.state.kind === "done" && input.history.length === claims.turn
          ? input.journeyToken
          : issueJourneyToken({
              secret,
              journeyId: claims.journeyId,
              release,
              route: claims.route,
              subjectBrief: input.subjectBrief,
              history: input.history,
              precision: input.precision,
              state: { kind: "done" },
              consent: claims.consent,
              rawContentSampled: claims.rawContentSampled,
              now: claims.issuedAt,
            });
        return json({
          journey: { id: claims.journeyId, route: claims.route, token },
          decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
          diagnostics: { source: "remainingEmpty", fallbackUsed: false },
          rawContentEligible: deps.rawContentSamplingEnabled === true
            && claims.consent !== null
            && claims.rawContentSampled,
        });
      }
      if (claims.state.kind !== "ask" || input.history.length !== claims.turn + 1) {
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
      consent = claims.consent;
      rawContentSampled = claims.rawContentSampled;
    } catch {
      return json({ error: "invalid_journey_state" }, 400);
    }
  }
  const capturedRawProviderContent: ProviderDiagnosticContent[] = [];
  const captureRawProviderContent = (providerContent: unknown): void => {
    if (deps.rawContentSamplingEnabled === true
      && deps.rawContentStore
      && deps.scheduleAfterResponse
      && consent !== null
      && rawContentSampled) {
      try {
        const diagnosticContent = extractProviderDiagnosticContent(providerContent);
        if (diagnosticContent) capturedRawProviderContent.push(diagnosticContent);
      } catch {
        // Diagnostic extraction must never change the Journey result.
      }
    }
  };
  let result: {
    decision: { nextQuestionId: string | null; visibleOptionIds: string[]; done: boolean };
    diagnostics: unknown;
  };
  if (route === "adaptive") {
    let adaptiveResponse: Response;
    let rawBody: Uint8Array | undefined;
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
        onEvidence: (evidence) => {
          if (evidence.rawBody) rawBody = evidence.rawBody;
        },
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
    if (rawBody) {
      captureRawProviderContent({
        encoding: "base64",
        data: Buffer.from(rawBody).toString("base64"),
      });
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
      }, async (providerRequest) => {
        const providerContent = await deps.fixedTransport(providerRequest);
        captureRawProviderContent(providerContent);
        return providerContent;
      }, {
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
    consent,
    rawContentSampled,
    now,
  });
  const rawContentStore = deps.rawContentStore;
  const scheduleAfterResponse = deps.scheduleAfterResponse;
  if (capturedRawProviderContent.length > 0 && rawContentStore && scheduleAfterResponse) {
    try {
      // Storage happens only after the same server-derived consent and sample
      // have been bound into a valid signed Journey token.
      const rawClaims = readJourneyToken(secret, token, now);
      if (rawClaims.consent !== null && rawClaims.rawContentSampled) {
        const records = capturedRawProviderContent.map((providerContent, delivery) => ({
          version: 1,
          kind: "provider",
          journeyId: rawClaims.journeyId,
          release: rawClaims.release,
          route: rawClaims.route,
          turn: rawClaims.turn,
          recordedAt: now,
          expiresAt: now + RAW_CONTENT_RETENTION_MS,
          subjectBrief: input.subjectBrief,
          history: input.history.map((item) => ({
            ...item,
            selectedOptionIds: [...item.selectedOptionIds],
          })),
          delivery,
          providerContent,
        } as const));
        const task = async (): Promise<void> => {
          try {
            await Promise.allSettled(records.map((record) => (
              Promise.resolve().then(() => rawContentStore.write(record))
            )));
          } catch {
            // Diagnostic storage must never change the Journey result.
          }
        };
        try {
          scheduleAfterResponse(task);
        } catch {
          // A platform scheduler failure must not change the Journey result.
        }
      }
    } catch {
      // Diagnostic storage must never change the Journey result.
    }
  }
  return json({
    journey: { id: journeyId, route, token },
    decision: result.decision,
    diagnostics: result.diagnostics,
    rawContentEligible: deps.rawContentSamplingEnabled === true
      && consent !== null
      && rawContentSampled,
  });
}
