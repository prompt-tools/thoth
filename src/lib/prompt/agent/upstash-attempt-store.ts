import type {
  AttemptStartedRecord,
  AttemptStore,
  AttemptTerminalRecord,
} from "./attempt-lifecycle";

const KEY_PREFIX = "thoth:journey-attempt:v1:";

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
  redis.call('HSET', KEYS[1], 'terminal', ARGV[1], 'terminalIdentity', ARGV[2])
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

  async function command<T extends string>(
    args: string[],
    allowed: readonly T[],
  ): Promise<T> {
    if (!url || !token) throw new Error("attempt_store_unavailable");
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("attempt_store_unavailable");
    const payload = await response.json() as { result?: unknown; error?: unknown };
    if (payload.error !== undefined || !isResult(payload.result, allowed)) {
      throw new Error("attempt_store_invalid_response");
    }
    return payload.result;
  }

  return {
    start(record: AttemptStartedRecord) {
      return command([
        "EVAL",
        START_SCRIPT,
        "1",
        `${KEY_PREFIX}${record.attemptId}`,
        JSON.stringify(record),
        String(record.expiresAt),
      ], ["created", "exists"] as const);
    },
    finish(attemptId: string, record: AttemptTerminalRecord) {
      return command([
        "EVAL",
        FINISH_SCRIPT,
        "1",
        `${KEY_PREFIX}${attemptId}`,
        JSON.stringify(record),
        terminalIdentity(record),
        String(record.endedAt),
      ], ["written", "idempotent", "conflict", "missing"] as const);
    },
  };
}
