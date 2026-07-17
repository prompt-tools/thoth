import { describe, expect, it, vi } from "vitest";
import type { AttemptStartedRecord, AttemptTerminalRecord } from "./attempt-lifecycle";
import { createUpstashAttemptStore } from "./upstash-attempt-store";

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
          "1",
          "thoth:journey-attempt:v1:attempt-1",
        ]);
        expect(JSON.parse(command[4])).toEqual(terminal);
        expect(JSON.parse(command[5])).toEqual({ outcome: "success", validation: "ask" });
        expect(command[1]).toContain("HINCRBY");
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
});
