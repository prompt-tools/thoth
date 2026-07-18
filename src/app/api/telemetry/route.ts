import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ATTEMPT_RETENTION_MS } from "@/lib/prompt/agent/attempt-lifecycle";
import { readJourneyToken } from "@/lib/prompt/agent/journey-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const KEY_PREFIX = "thoth:journey-outcome:v1:";
const EVENT_STATES = {
  answer_submitted: "ask",
  turn_skipped: "ask",
  prompt_rendered: "done",
} as const;

type OutcomeEventType = keyof typeof EVENT_STATES;

const CREATE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 'exists'
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
return 'created'
`.trim();

function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

function eventType(value: unknown): OutcomeEventType | undefined {
  return typeof value === "string" && Object.hasOwn(EVENT_STATES, value)
    ? value as OutcomeEventType
    : undefined;
}

export async function POST(request: Request) {
  const secret = process.env.ADAPTIVE_TURN_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return json({ ok: false, error: "telemetry_unavailable" }, 503);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    payload = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const type = eventType(payload.eventType);
  if (!type) return json({ ok: false, error: "unsupported_event" }, 400);
  if (typeof payload.journeyId !== "string" || typeof payload.journeyToken !== "string") {
    return json({ ok: false, error: "invalid_journey_state" }, 401);
  }

  const now = Date.now();
  let claims;
  try {
    claims = readJourneyToken(secret, payload.journeyToken, now);
    if (claims.journeyId !== payload.journeyId) throw new Error();
  } catch {
    return json({ ok: false, error: "invalid_journey_state" }, 401);
  }
  if (claims.state.kind !== EVENT_STATES[type]) {
    return json({ ok: false, error: "journey_state_mismatch" }, 409);
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return json({ ok: false, error: "telemetry_unavailable" }, 503);

  const expiresAt = now + ATTEMPT_RETENTION_MS;
  const record = {
    version: 1,
    eventType: type,
    journeyId: claims.journeyId,
    release: claims.release,
    route: claims.route,
    turn: claims.turn,
    stateKind: claims.state.kind,
    ...(claims.state.kind === "ask" ? { questionId: claims.state.questionId } : {}),
    recordedAt: now,
    expiresAt,
  };
  const identity = createHash("sha256")
    .update(`${claims.journeyId}\0${claims.turn}\0${type}`, "utf8")
    .digest("base64url");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        CREATE_SCRIPT,
        "1",
        `${KEY_PREFIX}${identity}`,
        JSON.stringify(record),
        String(expiresAt),
      ]),
      redirect: "error",
      cache: "no-store",
    });
    const result = await response.json() as { result?: unknown; error?: unknown };
    if (!response.ok || result.error !== undefined
      || (result.result !== "created" && result.result !== "exists")) {
      return json({ ok: false, error: "telemetry_unavailable" }, 503);
    }
    const duplicate = result.result === "exists";
    return json({ ok: true, duplicate }, duplicate ? 200 : 202);
  } catch {
    return json({ ok: false, error: "telemetry_unavailable" }, 503);
  }
}
