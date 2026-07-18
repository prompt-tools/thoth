import { createHash } from "node:crypto";
import {
  ATTEMPT_AGGREGATE_RETENTION_MS,
  type AttemptRoute,
  type AttemptStartedRecord,
  type AttemptStore,
  type AttemptTerminalRecord,
} from "./attempt-lifecycle";

const KEY_PREFIX = "thoth:journey-attempt:v1:";
const AGGREGATE_KEY_PREFIX = "thoth:journey-attempt-aggregate:v1:";
const MISSING_AGGREGATE_KEY = `${AGGREGATE_KEY_PREFIX}unresolved`;
export const UPSTASH_FETCH_TIMEOUT_MS = 2_000;

const START_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 'exists'
end
redis.call('HSET', KEYS[1], 'started', ARGV[1], 'conflictCount', '0')
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
return 'created'
`.trim();

const FINISH_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  return 'missing'
end
local currentIdentity = redis.call('HGET', KEYS[1], 'terminalIdentity')
if not currentIdentity then
  if ARGV[4] ~= '1' then
    return 'missing'
  end
  redis.call('HSET', KEYS[1], 'terminal', ARGV[1], 'terminalIdentity', ARGV[2])
  local count = redis.call('INCR', KEYS[2])
  if count == 1 then
    redis.call('PEXPIREAT', KEYS[2], ARGV[5])
  end
  return 'written'
end
if currentIdentity == ARGV[2] then
  return 'idempotent'
end
redis.call('HINCRBY', KEYS[1], 'conflictCount', 1)
redis.call('HSET', KEYS[1], 'lastConflictIdentity', ARGV[2], 'lastConflictAt', ARGV[3])
return 'conflict'
`.trim();

interface UpstashStoreConfig {
  url: string;
  token: string;
  fetcher?: typeof fetch;
}

function isResult<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
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

function hashRelease(release: string): string {
  return createHash("sha256").update(release, "utf8").digest("base64url");
}

function aggregateKey(
  dimensions: { releaseHash: string; route: AttemptRoute },
  record: AttemptTerminalRecord,
): string {
  const day = new Date(record.endedAt).toISOString().slice(0, 10);
  return `${AGGREGATE_KEY_PREFIX}${day}:${dimensions.releaseHash}:${dimensions.route}:${record.outcome}`;
}

function terminalIdentity(record: AttemptTerminalRecord): string {
  if (record.outcome === "success") {
    const usage = record.usage === undefined ? undefined : {
      ...(record.usage.promptTokens === undefined ? {} : { promptTokens: record.usage.promptTokens }),
      ...(record.usage.completionTokens === undefined ? {} : { completionTokens: record.usage.completionTokens }),
    };
    return JSON.stringify({
      outcome: record.outcome,
      validation: record.validation,
      ...(usage === undefined ? {} : { usage }),
    });
  }
  return JSON.stringify({
    outcome: record.outcome,
    failureCode: record.failureCode,
    ...(record.providerStatus === undefined ? {} : { providerStatus: record.providerStatus }),
  });
}

export function createUpstashAttemptStore(config: UpstashStoreConfig): AttemptStore {
  const url = config.url.trim().replace(/\/+$/, "");
  const token = config.token.trim();
  const fetcher = config.fetcher ?? fetch;
  // The production route constructs one store per request, so the Started and
  // terminal writes share these aggregate dimensions without persisting them.
  const dimensionsByAttempt = new Map<string, { releaseHash: string; route: AttemptRoute }>();

  async function command<T extends string>(
    args: string[],
    allowed: readonly T[],
  ): Promise<T> {
    if (!url || !token) throw new Error("attempt_store_unavailable");
    const signal = AbortSignal.timeout(UPSTASH_FETCH_TIMEOUT_MS);
    const response = await bounded(fetcher(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      redirect: "error",
      cache: "no-store",
      signal,
    }), signal);
    if (!response.ok) throw new Error("attempt_store_unavailable");
    const payload = await bounded(response.json() as Promise<{
      result?: unknown;
      error?: unknown;
    }>, signal);
    if (payload.error !== undefined || !isResult(payload.result, allowed)) {
      throw new Error("attempt_store_invalid_response");
    }
    return payload.result;
  }

  return {
    async start(record: AttemptStartedRecord) {
      const result = await command([
        "EVAL",
        START_SCRIPT,
        "1",
        `${KEY_PREFIX}${record.attemptId}`,
        JSON.stringify(record),
        String(record.expiresAt),
      ], ["created", "exists"] as const);
      if (result === "created") {
        dimensionsByAttempt.set(record.attemptId, {
          releaseHash: hashRelease(record.release),
          route: record.route,
        });
      }
      return result;
    },
    finish(attemptId: string, record: AttemptTerminalRecord) {
      const dimensions = dimensionsByAttempt.get(attemptId);
      const key = dimensions === undefined
        ? MISSING_AGGREGATE_KEY
        : aggregateKey(dimensions, record);
      return command([
        "EVAL",
        FINISH_SCRIPT,
        "2",
        `${KEY_PREFIX}${attemptId}`,
        key,
        JSON.stringify(record),
        terminalIdentity(record),
        String(record.endedAt),
        dimensions === undefined ? "0" : "1",
        String(record.endedAt + ATTEMPT_AGGREGATE_RETENTION_MS),
      ], ["written", "idempotent", "conflict", "missing"] as const);
    },
  };
}
