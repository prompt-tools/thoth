import "@/lib/prompt/init";
import { renderPrompt } from "@/lib/prompt/adapters";
import { RAW_CONTENT_MAX_BYTES, RAW_CONTENT_RETENTION_MS, createRawContentStore } from "@/lib/prompt/agent/raw-content-store";
import { buildCatalogManifest } from "@/lib/prompt/agent/catalog-manifest";
import { buildRenderInputs, withInferredSubject } from "@/lib/prompt/agent/history";
import {
  matchesJourneySnapshot,
  readJourneyToken,
  type JourneyClaims,
} from "@/lib/prompt/agent/journey-state";
import type { AgentHistoryItem } from "@/lib/prompt/agent/decision";
import type { Precision } from "@/lib/prompt/agent/gradient";
import { routePrimaryType } from "@/lib/prompt/agent/routing";
import { imagePromptAgentWorkType } from "@/lib/prompt/work-types/image-prompt-agent.worktype";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function accepted(): Response {
  return json({ ok: true }, 202);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isHistory(value: unknown): value is AgentHistoryItem[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!isObject(entry)
      || typeof entry.questionId !== "string"
      || !Array.isArray(entry.selectedOptionIds)
      || !entry.selectedOptionIds.every((id) => typeof id === "string")
      || (entry.freeText !== undefined && typeof entry.freeText !== "string")) {
      return false;
    }
    return true;
  });
}

function copyHistory(value: AgentHistoryItem[]): AgentHistoryItem[] {
  return value.map((entry) => ({
    questionId: entry.questionId,
    selectedOptionIds: [...entry.selectedOptionIds],
    ...(entry.freeText === undefined ? {} : { freeText: entry.freeText }),
  }));
}

function isPrecision(value: unknown): value is Precision {
  return value === "simple" || value === "standard" || value === "detailed";
}

interface CompletionInput {
  journeyId: string;
  journeyToken: string;
  subjectBrief: string;
  history: AgentHistoryItem[];
  precision: Precision;
}

function parseInput(value: unknown): CompletionInput {
  if (!isObject(value)
    || typeof value.journeyId !== "string"
    || typeof value.journeyToken !== "string"
    || typeof value.subjectBrief !== "string"
    || !isHistory(value.history)
    || !isPrecision(value.precision)) {
    throw new Error("invalid_request");
  }
  return {
    journeyId: value.journeyId,
    journeyToken: value.journeyToken,
    subjectBrief: value.subjectBrief,
    history: copyHistory(value.history),
    precision: value.precision,
  };
}

function renderFinalPrompt(input: CompletionInput): { zh: string; en: string } {
  const manifest = buildCatalogManifest();
  const primaryType = routePrimaryType(input.subjectBrief);
  const { selections, freeTexts } = buildRenderInputs(
    withInferredSubject(input.history, input.subjectBrief, primaryType),
    manifest,
  );
  const rendered = renderPrompt({
    workType: imagePromptAgentWorkType,
    rawIntent: input.subjectBrief,
    selections,
    freeTexts,
  });
  return { zh: rendered.zhPrompt, en: rendered.enPrompt };
}

function invalidJourney(): Response {
  return json({ ok: false, error: "invalid_journey_state" }, 401);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.ADAPTIVE_TURN_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return json({ ok: false, error: "raw_content_unavailable" }, 503);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
  if (Buffer.byteLength(raw, "utf8") > RAW_CONTENT_MAX_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let input: CompletionInput;
  try {
    input = parseInput(JSON.parse(raw) as unknown);
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const now = Date.now();
  let claims: JourneyClaims;
  try {
    claims = readJourneyToken(secret, input.journeyToken, now);
    if (claims.journeyId !== input.journeyId) throw new Error("invalid_journey_state");
  } catch {
    return invalidJourney();
  }
  if (claims.state.kind !== "done" || !matchesJourneySnapshot(
    claims,
    input.subjectBrief,
    input.history,
    input.precision,
  )) {
    return json({ ok: false, error: "journey_state_mismatch" }, 409);
  }

  if (process.env.RAW_CONTENT_SAMPLING_ENABLED !== "1"
    || process.env.RAW_CONTENT_RETENTION_VERIFIED !== "1"
    || claims.consent === null
    || !claims.rawContentSampled) {
    return accepted();
  }

  const url = process.env.RAW_CONTENT_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = process.env.RAW_CONTENT_REDIS_REST_TOKEN?.trim();
  const attemptUrl = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const attemptToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token || !attemptUrl || !attemptToken
    || url === attemptUrl || token === attemptToken) {
    return json({ ok: false, error: "raw_content_unavailable" }, 503);
  }

  try {
    const store = createRawContentStore({ url, token });
    await store.write({
      version: 1,
      kind: "completion",
      journeyId: claims.journeyId,
      release: claims.release,
      route: claims.route,
      turn: claims.turn,
      recordedAt: now,
      expiresAt: now + RAW_CONTENT_RETENTION_MS,
      subjectBrief: input.subjectBrief,
      history: input.history,
      finalPrompt: renderFinalPrompt(input),
    });
  } catch {
    return json({ ok: false, error: "raw_content_unavailable" }, 503);
  }
  return accepted();
}
