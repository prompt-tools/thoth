import { describe, expect, it, vi } from "vitest";
import {
  ATTEMPT_AGGREGATE_RETENTION_MS,
  ATTEMPT_RETENTION_MS,
  type AttemptStartedRecord,
  type AttemptTerminalRecord,
} from "./attempt-lifecycle";
import {
  createUpstashAttemptStore,
  UPSTASH_FETCH_TIMEOUT_MS,
} from "./upstash-attempt-store";

const started: AttemptStartedRecord = {
  version: 1,
  attemptId: "attempt-1",
  journeyId: "journey-1",
  release: "release-a",
  route: "fixed",
  cohort: "fixed",
  turn: 2,
  startedAt: 1_700_000_000_000,
  expiresAt: 1_702_592_000_000,
};

const terminal: AttemptTerminalRecord = {
  outcome: "success",
  validation: "ask",
  endedAt: 1_700_000_000_120,
  durationMs: 120,
};

describe("Upstash attempt persistence", () => {
  it("preserves Started-only missing state and enforces terminal idempotency/conflict atomically", async () => {
    type Stored = {
      started: AttemptStartedRecord;
      terminal?: AttemptTerminalRecord;
      terminalIdentity?: string;
      expiresAt: number;
      conflictCount: number;
      lastConflictIdentity?: string;
    };
    const hashes = new Map<string, Stored>();
    const aggregates = new Map<string, { count: number; expiresAt: number }>();
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      const key = command[3];
      if (command[2] === "1") {
        if (hashes.has(key)) return Response.json({ result: "exists" });
        hashes.set(key, {
          started: JSON.parse(command[4]) as AttemptStartedRecord,
          expiresAt: Number(command[5]),
          conflictCount: 0,
        });
        return Response.json({ result: "created" });
      }
      const aggregateKey = command[4];
      const stored = hashes.get(key);
      if (!stored) return Response.json({ result: "missing" });
      const incoming = JSON.parse(command[5]) as AttemptTerminalRecord;
      const identity = command[6];
      if (!stored.terminalIdentity) {
        stored.terminal = incoming;
        stored.terminalIdentity = identity;
        const aggregate = aggregates.get(aggregateKey);
        if (aggregate) aggregate.count += 1;
        else aggregates.set(aggregateKey, { count: 1, expiresAt: Number(command[9]) });
        return Response.json({ result: "written" });
      }
      if (stored.terminalIdentity === identity) return Response.json({ result: "idempotent" });
      stored.conflictCount += 1;
      stored.lastConflictIdentity = identity;
      return Response.json({ result: "conflict" });
    });
    const store = createUpstashAttemptStore({
      url: "https://example.upstash.io",
      token: "secret-token",
      fetcher: fetcher as typeof fetch,
    });

    expect(await store.start(started)).toBe("created");
    const interrupted = { ...started, attemptId: "attempt-interrupted" };
    expect(await store.start(interrupted)).toBe("created");
    expect(hashes.get("thoth:journey-attempt:v1:attempt-interrupted")).toEqual(expect.objectContaining({
      started: interrupted,
      expiresAt: interrupted.expiresAt,
    }));
    expect(hashes.get("thoth:journey-attempt:v1:attempt-interrupted")?.terminal).toBeUndefined();

    expect(await store.finish("attempt-1", terminal)).toBe("written");
    expect(await store.finish("attempt-1", {
      ...terminal,
      endedAt: terminal.endedAt + 10,
      durationMs: terminal.durationMs + 10,
    })).toBe("idempotent");
    const conflicting: AttemptTerminalRecord = {
      outcome: "failure",
      failureCode: "http_503",
      providerStatus: 503,
      endedAt: terminal.endedAt + 20,
      durationMs: terminal.durationMs + 20,
    };
    expect(await store.finish("attempt-1", conflicting)).toBe("conflict");
    expect(await store.finish("missing-attempt", terminal)).toBe("missing");
    expect(hashes.get("thoth:journey-attempt:v1:attempt-1")).toEqual(expect.objectContaining({
      terminal,
      conflictCount: 1,
      lastConflictIdentity: JSON.stringify({
        outcome: "failure",
        failureCode: "http_503",
        providerStatus: 503,
      }),
    }));
    expect(aggregates).toHaveProperty("size", 1);
    const [aggregateKey, aggregate] = [...aggregates.entries()][0];
    expect(aggregate).toEqual({
      count: 1,
      expiresAt: terminal.endedAt + ATTEMPT_AGGREGATE_RETENTION_MS,
    });
    expect(aggregateKey).not.toContain(started.attemptId);
    expect(aggregateKey).not.toContain(started.journeyId);
    expect(JSON.stringify(aggregate)).not.toContain(started.attemptId);
    expect(JSON.stringify(aggregate)).not.toContain(started.journeyId);
  });

  it("atomically creates a content-free started hash with the absolute 30-day expiry", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      expect(command.slice(0, 4)).toEqual([
        "EVAL",
        expect.stringContaining("PEXPIREAT"),
        "1",
        "thoth:journey-attempt:v1:attempt-1",
      ]);
      expect(JSON.parse(command[4])).toEqual(started);
      expect(command[5]).toBe(String(started.expiresAt));
      expect(command.join(" ")).not.toContain("subjectBrief");
      return Response.json({ result: "created" });
    });
    const store = createUpstashAttemptStore({
      url: "https://example.upstash.io",
      token: "secret-token",
      fetcher: fetcher as typeof fetch,
    });

    await expect(store.start(started)).resolves.toBe("created");
    expect(fetcher).toHaveBeenCalledWith("https://example.upstash.io", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer secret-token" }),
    }));
  });

  it.each(["written", "idempotent", "conflict", "missing"] as const)(
    "maps the atomic terminal result %s without replacing a prior terminal",
    async (result) => {
      const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        const command = JSON.parse(String(init?.body)) as string[];
        expect(command.slice(0, 4)).toEqual([
          "EVAL",
          expect.stringContaining("terminalIdentity"),
          "2",
          "thoth:journey-attempt:v1:attempt-1",
        ]);
        expect(command[4]).toContain("thoth:journey-attempt-aggregate:v1:");
        expect(JSON.parse(command[5])).toEqual(terminal);
        expect(JSON.parse(command[6])).toEqual({ outcome: "success", validation: "ask" });
        expect(command[1]).toContain("INCR");
        expect(command[1]).toContain("PEXPIREAT");
        expect(command[7]).toBe(String(terminal.endedAt));
        expect(command[9]).toBe(String(terminal.endedAt + ATTEMPT_AGGREGATE_RETENTION_MS));
        return Response.json({ result });
      });
      const store = createUpstashAttemptStore({
        url: "https://example.upstash.io",
        token: "secret-token",
        fetcher: fetcher as typeof fetch,
      });

      await expect(store.finish("attempt-1", terminal)).resolves.toBe(result);
    },
  );

  it("fails closed when durable storage is not configured", async () => {
    const store = createUpstashAttemptStore({ url: "", token: "" });
    await expect(store.start(started)).rejects.toThrow("attempt_store_unavailable");
  });

  it("bounds a hanging Redis fetch with the shared abort signal", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    let signal: AbortSignal | null | undefined;
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      signal = init?.signal;
      const pending = new Promise<Response>((_, reject) => {
        const requestSignal = init?.signal;
        if (!requestSignal) {
          reject(new Error("missing_signal"));
          return;
        }
        if (requestSignal.aborted) {
          reject(requestSignal.reason);
          return;
        }
        requestSignal.addEventListener("abort", () => reject(requestSignal.reason), { once: true });
      });
      controller.abort(new Error("redis_fetch_timeout"));
      return pending;
    });
    const store = createUpstashAttemptStore({
      url: "https://example.upstash.io",
      token: "secret-token",
      fetcher: fetcher as typeof fetch,
    });

    await expect(store.start(started)).rejects.toThrow("redis_fetch_timeout");
    expect(timeout).toHaveBeenCalledWith(UPSTASH_FETCH_TIMEOUT_MS);
    expect(signal).toBe(controller.signal);
    timeout.mockRestore();
  });

  it("bounds a hanging Redis response body with the same signal", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: () => {
        controller.abort(new Error("redis_body_timeout"));
        return new Promise<never>(() => {});
      },
    }));
    const store = createUpstashAttemptStore({
      url: "https://example.upstash.io",
      token: "secret-token",
      fetcher: fetcher as unknown as typeof fetch,
    });

    await expect(store.start(started)).rejects.toThrow("redis_body_timeout");
    expect(timeout).toHaveBeenCalledWith(UPSTASH_FETCH_TIMEOUT_MS);
    timeout.mockRestore();
  });

  it("writes absolute 30-day attempt and 90-day aggregate deadlines", async () => {
    const hashes = new Map<string, { expiresAt: number }>();
    const aggregates = new Map<string, { count: number; expiresAt: number }>();
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const command = JSON.parse(String(init?.body)) as string[];
      const key = command[3];
      if (command[2] === "1") {
        hashes.set(key, { expiresAt: Number(command[5]) });
        return Response.json({ result: "created" });
      }
      if (!hashes.has(key)) return Response.json({ result: "missing" });
      const aggregateKey = command[4];
      const aggregate = aggregates.get(aggregateKey);
      if (aggregate) aggregate.count += 1;
      else aggregates.set(aggregateKey, {
        count: 1,
        expiresAt: Number(command[9]),
      });
      return Response.json({ result: "written" });
    });
    const store = createUpstashAttemptStore({
      url: "https://example.upstash.io",
      token: "secret-token",
      fetcher: fetcher as typeof fetch,
    });

    await store.start(started);
    await store.finish("attempt-1", terminal);
    const [aggregateKey, aggregate] = [...aggregates.entries()][0];
    expect(hashes.get("thoth:journey-attempt:v1:attempt-1")?.expiresAt).toBe(started.expiresAt);
    expect(aggregateKey).toContain("thoth:journey-attempt-aggregate:v1:");
    expect(aggregate.expiresAt).toBe(terminal.endedAt + ATTEMPT_AGGREGATE_RETENTION_MS);

    expect(ATTEMPT_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
