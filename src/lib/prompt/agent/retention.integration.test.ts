// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as postTelemetry } from "@/app/api/telemetry/route";
import {
  ATTEMPT_AGGREGATE_RETENTION_MS,
  ATTEMPT_RETENTION_MS,
  createProviderAttemptLifecycle,
} from "./attempt-lifecycle";
import { issueJourneyToken } from "./journey-state";
import { createRawContentStore } from "./raw-content-store";
import { createUpstashAttemptStore } from "./upstash-attempt-store";

const LIVE = process.env.RAW_RETENTION_INTEGRATION === "1";
const PROBE_TTL_MS = 3_000;
const POLL_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 250;
const REQUEST_TIMEOUT_MS = 2_000;
const ISOLATION_ACK = "I_UNDERSTAND_ISOLATED_NON_PRODUCTION";
const TELEMETRY_SECRET = "retention-live-test-secret-with-at-least-32-bytes";
const REAL_FETCH: typeof fetch = fetch;

type RedisCredentials = { url: string; token: string };

function credentials(urlName: string, tokenName: string): RedisCredentials {
  const url = process.env[urlName]?.trim().replace(/\/+$/, "") ?? "";
  const token = process.env[tokenName]?.trim() ?? "";
  if (!url || !token) {
    throw new Error(
      `RAW_RETENTION_INTEGRATION=1 requires isolated test credentials ${urlName} and ${tokenName}; production credentials are never used`,
    );
  }
  return { url, token };
}

function requireIsolationAcknowledgement(): void {
  if (process.env.RAW_RETENTION_TEST_ISOLATION_ACK?.trim() !== ISOLATION_ACK) {
    throw new Error(
      `RAW_RETENTION_INTEGRATION=1 requires RAW_RETENTION_TEST_ISOLATION_ACK=${ISOLATION_ACK} and isolated non-production Redis credentials`,
    );
  }
}

function boundedInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

async function command(
  config: RedisCredentials,
  args: string[],
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<unknown> {
  const response = await REAL_FETCH(config.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
  });
  if (!response.ok) throw new Error(`retention_probe_http_${response.status}`);
  const payload = await response.json() as { result?: unknown; error?: unknown };
  if (payload.error !== undefined || !Object.prototype.hasOwnProperty.call(payload, "result")) {
    throw new Error("retention_probe_invalid_response");
  }
  return payload.result;
}

async function deleteProbeKeys(
  config: RedisCredentials,
  keys: Iterable<string>,
): Promise<void> {
  const failures: string[] = [];
  for (const key of new Set([...keys].filter(Boolean))) {
    try {
      await command(config, ["DEL", key]);
    } catch {
      failures.push(key);
    }
  }
  if (failures.length > 0) {
    throw new Error(`retention_probe_cleanup_failed:${failures.join(",")}`);
  }
}

async function expectCreatedThenDeleted(
  config: RedisCredentials,
  keys: Iterable<string>,
): Promise<void> {
  const pending = new Set([...keys].filter(Boolean));
  if (pending.size === 0) throw new Error("retention_probe_key_not_captured");
  for (const key of pending) {
    expect(await command(config, ["EXISTS", key])).toBe(1);
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (pending.size > 0) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`retention_probe_key_not_deleted:${[...pending].join(",")}`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(POLL_INTERVAL_MS, remaining)));
    for (const key of pending) {
      const exists = await command(
        config,
        ["EXISTS", key],
        Math.min(REQUEST_TIMEOUT_MS, Math.max(1, deadline - Date.now())),
      );
      if (exists === 0) pending.delete(key);
    }
  }
}

async function shortenExpiry(
  config: RedisCredentials,
  keys: Iterable<string>,
): Promise<void> {
  // The production 30/90-day absolute TTLs are asserted by each probe first;
  // waiting those periods is infeasible, so only the live keys are shortened.
  const expiresAt = Date.now() + PROBE_TTL_MS;
  for (const key of new Set([...keys].filter(Boolean))) {
    expect(await command(config, ["PEXPIREAT", key, String(expiresAt)])).toBe(1);
  }
}

function telemetryRequest(body: unknown): Request {
  return new Request("http://localhost/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe.skipIf(!LIVE)("live Redis retention deletion", () => {
  let raw: RedisCredentials;
  let attempts: RedisCredentials;

  beforeAll(() => {
    requireIsolationAcknowledgement();
    raw = credentials(
      "RAW_RETENTION_TEST_RAW_REDIS_REST_URL",
      "RAW_RETENTION_TEST_RAW_REDIS_REST_TOKEN",
    );
    attempts = credentials(
      "RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_URL",
      "RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_TOKEN",
    );
  });

  it("deletes the synthetic raw-content probe at its PXAT", async () => {
    const keys = new Set<string>();
    let setCommand: string[] | undefined;
    const capturingFetch: typeof fetch = async (input, init) => {
      const args = JSON.parse(String(init?.body)) as string[];
      if (args[0] === "SET") {
        keys.add(args[1] ?? "");
        setCommand = args;
      }
      return REAL_FETCH(input, boundedInit(init));
    };
    const now = Date.now();
    const id = randomUUID();
    const expiresAt = now + PROBE_TTL_MS;
    const store = createRawContentStore({ ...raw, fetcher: capturingFetch });

    try {
      await expect(store.write({
        version: 1,
        kind: "completion",
        journeyId: `retention-probe-${id}`,
        release: "retention-probe",
        route: "fixed",
        turn: 0,
        recordedAt: now,
        expiresAt,
        subjectBrief: "",
        history: [],
        finalPrompt: { zh: "retention-probe", en: "retention-probe" },
      })).resolves.toBe("stored");
      expect(keys.size).toBe(1);
      const [key] = [...keys];
      expect(key).toMatch(/^thoth:raw-content:v1:[a-f0-9]{64}$/);
      expect(setCommand?.slice(0, 2)).toEqual(["SET", key]);
      expect(setCommand?.[3]).toBe("NX");
      expect(setCommand?.[4]).toBe("PXAT");
      expect(setCommand?.[5]).toBe(String(expiresAt));
      await expectCreatedThenDeleted(raw, keys);
    } finally {
      await deleteProbeKeys(raw, keys);
    }
  }, 25_000);

  it("finishes a content-free attempt with 30-day semantics and deletes its probes", async () => {
    const keys = new Set<string>();
    let startCommand: string[] | undefined;
    let finishCommand: string[] | undefined;
    const capturingFetch: typeof fetch = async (input, init) => {
      const args = JSON.parse(String(init?.body)) as string[];
      if (args[0] === "EVAL" && args[2] === "1") {
        keys.add(args[3] ?? "");
        startCommand = args;
      }
      if (args[0] === "EVAL" && args[2] === "2") {
        keys.add(args[3] ?? "");
        keys.add(args[4] ?? "");
        finishCommand = args;
      }
      return REAL_FETCH(input, boundedInit(init));
    };
    const probeId = randomUUID();
    const id = `retention-probe-${probeId}`;
    const release = `retention-probe-${probeId}`;
    let now = Date.now();
    const store = createUpstashAttemptStore({ ...attempts, fetcher: capturingFetch });
    const lifecycle = createProviderAttemptLifecycle({
      store,
      newAttemptId: () => id,
      now: () => now,
      journeyId: id,
      release,
      route: "fixed",
      turn: 0,
    });

    try {
      const attempt = await lifecycle.start();
      expect(startCommand?.[3]).toMatch(/^thoth:journey-attempt:v1:retention-probe-/);
      expect(startCommand?.[5]).toBe(String(attempt.startedAt + ATTEMPT_RETENTION_MS));

      now += 10;
      await expect(lifecycle.finish(attempt, { outcome: "success", validation: "ask" }))
        .resolves.toBeUndefined();
      expect(finishCommand?.[3]).toBe(startCommand?.[3]);
      expect(finishCommand?.[4]).toMatch(
        /^thoth:journey-attempt-aggregate:v1:[0-9]{4}-[0-9]{2}-[0-9]{2}:[A-Za-z0-9_-]{43}:fixed:success$/,
      );
      expect(finishCommand?.[9]).toBe(String(now + ATTEMPT_AGGREGATE_RETENTION_MS));
      expect(JSON.stringify(startCommand)).not.toContain("subjectBrief");
      await shortenExpiry(attempts, keys);
      await expectCreatedThenDeleted(attempts, keys);
    } finally {
      await deleteProbeKeys(attempts, keys);
    }
  }, 25_000);

  it("creates content-free outcome and aggregate probes, then deletes both", async () => {
    const keys = new Set<string>();
    let outcomeCommand: string[] | undefined;
    const capturingFetch: typeof fetch = async (input, init) => {
      const args = JSON.parse(String(init?.body)) as string[];
      if (args[0] === "EVAL" && args[2] === "2") {
        keys.add(args[3] ?? "");
        keys.add(args[4] ?? "");
        outcomeCommand = args;
      }
      return REAL_FETCH(input, boundedInit(init));
    };
    const probeId = randomUUID();
    const id = `retention-probe-${probeId}`;
    const release = `retention-probe-${probeId}`;
    const now = Date.now();
    const journeyToken = issueJourneyToken({
      secret: TELEMETRY_SECRET,
      journeyId: id,
      release,
      route: "fixed",
      subjectBrief: "",
      history: [],
      precision: "simple",
      state: {
        kind: "ask",
        questionId: "framing",
        optionIds: ["image_framing:close_up"],
        mode: "single",
      },
      now,
    });

    vi.stubEnv("ADAPTIVE_TURN_SECRET", TELEMETRY_SECRET);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", attempts.url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", attempts.token);
    vi.stubGlobal("fetch", capturingFetch);

    try {
      const response = await postTelemetry(telemetryRequest({
        journeyId: id,
        journeyToken,
        eventType: "answer_submitted",
        subjectBrief: "private subject must not be stored",
        freeText: "private free text must not be stored",
      }));
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ ok: true, duplicate: false });
      expect(outcomeCommand?.slice(0, 3)).toEqual([
        "EVAL",
        expect.stringContaining("PEXPIREAT"),
        "2",
      ]);
      const record = JSON.parse(outcomeCommand?.[5] ?? "null") as {
        recordedAt: number;
        expiresAt: number;
      };
      expect(outcomeCommand?.[3]).toMatch(/^thoth:journey-outcome:v1:[A-Za-z0-9_-]{43}$/);
      expect(outcomeCommand?.[4]).toMatch(
        /^thoth:journey-outcome-aggregate:v1:[0-9]{4}-[0-9]{2}-[0-9]{2}:[A-Za-z0-9_-]{43}:fixed:answer_submitted$/,
      );
      expect(outcomeCommand?.[6]).toBe(String(record.expiresAt));
      expect(record.expiresAt - record.recordedAt).toBe(ATTEMPT_RETENTION_MS);
      expect(Number(outcomeCommand?.[7]) - record.recordedAt).toBe(ATTEMPT_AGGREGATE_RETENTION_MS);
      expect(outcomeCommand?.[5]).not.toContain("private");

      // Production outcome TTLs are 30/90 days; shorten the verified keys only
      // after asserting those exact absolute expiries to keep this probe bounded.
      await shortenExpiry(attempts, keys);
      await expectCreatedThenDeleted(attempts, keys);
    } finally {
      await deleteProbeKeys(attempts, keys);
    }
  }, 25_000);
});
