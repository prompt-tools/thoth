import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ATTEMPT_AGGREGATE_RETENTION_MS,
  ATTEMPT_RETENTION_MS,
} from "@/lib/prompt/agent/attempt-lifecycle";
import { readJourneyToken } from "@/lib/prompt/agent/journey-state";
import { UPSTASH_FETCH_TIMEOUT_MS } from "@/lib/prompt/agent/upstash-attempt-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const KEY_PREFIX = "thoth:journey-outcome:v1:";
const AGGREGATE_KEY_PREFIX = "thoth:journey-outcome-aggregate:v1:";
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
local count = redis.call('INCR', KEYS[2])
if count == 1 then
  redis.call('PEXPIREAT', KEYS[2], ARGV[3])
end
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

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const rejectWithReason = () => reject(signal.reason ?? new Error("upstash_request_timeout"));
    if (signal.aborted) {
      rejectWithReason();
      return;
    }
    signal.addEventListener("abort", rejectWithReason, { once: true });
  });
}

function bounded<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return Promise.race([operation, rejectOnAbort(signal)]);
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
  const day = new Date(now).toISOString().slice(0, 10);
  const releaseHash = createHash("sha256").update(claims.release, "utf8").digest("base64url");
  const aggregateKey = `${AGGREGATE_KEY_PREFIX}${day}:${releaseHash}:${claims.route}:${type}`;

  try {
    const signal = AbortSignal.timeout(UPSTASH_FETCH_TIMEOUT_MS);
    const response = await bounded(fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        CREATE_SCRIPT,
        "2",
        `${KEY_PREFIX}${identity}`,
        aggregateKey,
        JSON.stringify(record),
        String(expiresAt),
        String(now + ATTEMPT_AGGREGATE_RETENTION_MS),
      ]),
      redirect: "error",
      cache: "no-store",
      signal,
    }), signal);
    const result = await bounded(response.json() as Promise<{
      result?: unknown;
      error?: unknown;
    }>, signal);
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
