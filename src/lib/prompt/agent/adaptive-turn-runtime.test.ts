import "@/lib/prompt/init";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleAdaptiveTurnRequest,
  type AdaptiveTurnRuntimeDeps,
} from "./adaptive-turn-runtime";

const TURN_SECRET = "a-strong-test-secret-with-at-least-32-bytes";

afterEach(() => {
  vi.useRealTimers();
});

function adaptiveRequest(body: unknown): Request {
  return new Request("http://localhost/api/adaptive-turn", {
    method: "POST",
    headers: {
      authorization: "Bearer replay-key",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("handleAdaptiveTurnRequest", () => {
  it("records one terminal failure around an accepted Adaptive provider call", async () => {
    const events: string[] = [];
    const attemptLifecycle = {
      start: vi.fn(async () => {
        events.push("started");
        return { attemptId: "attempt-adaptive-1", startedAt: 1_700_000_000_000 };
      }),
      finish: vi.fn(async (_attempt: unknown, terminal: unknown) => {
        events.push("terminal");
        expect(terminal).toEqual({
          outcome: "failure",
          failureCode: "http_429",
          providerStatus: 429,
        });
      }),
    };
    const response = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      attemptLifecycle,
      exchange: async () => {
        events.push("provider");
        return {
          kind: "http",
          status: 429,
          headers: {},
          body: new Uint8Array(),
        };
      },
    } as AdaptiveTurnRuntimeDeps);

    expect(response.status).toBe(200);
    expect(events).toEqual(["started", "provider", "terminal"]);
    expect(attemptLifecycle.finish).toHaveBeenCalledTimes(1);
  });

  it("records a server-validated Adaptive Completion without provider content", async () => {
    const attemptLifecycle = {
      start: vi.fn(async () => ({ attemptId: "attempt-completion", startedAt: 1_700_000_000_000 })),
      finish: vi.fn(async () => undefined),
    };
    const response = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "女船长怒视镜头，低机位，电影海报",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      attemptLifecycle,
      exchange: async () => ({
        kind: "http",
        status: 200,
        headers: {},
        body: new TextEncoder().encode(JSON.stringify({
          choices: [{
            finish_reason: "tool_calls",
            message: { tool_calls: [{ function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: true,
                nextQuestionId: null,
                questionText: null,
                helperText: null,
                optionIds: [],
              }),
            } }] },
          }],
        })),
      }),
    });

    expect(await response.json()).toMatchObject({ decision: { done: true } });
    expect(attemptLifecycle.finish).toHaveBeenCalledWith(
      { attemptId: "attempt-completion", startedAt: 1_700_000_000_000 },
      { outcome: "success", validation: "completion" },
    );
  });

  it("records provider cancellation as a distinct terminal failure", async () => {
    const attemptLifecycle = {
      start: vi.fn(async () => ({ attemptId: "attempt-cancelled", startedAt: 1_700_000_000_000 })),
      finish: vi.fn(async () => undefined),
    };
    await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      attemptLifecycle,
      exchange: async () => ({ kind: "network", reason: "provider_cancelled" }),
    });

    expect(attemptLifecycle.finish).toHaveBeenCalledWith(
      expect.any(Object),
      { outcome: "failure", failureCode: "provider_cancelled" },
    );
  });

  it("passes a recorded HTTP outcome through the production fallback boundary", async () => {
    const now = vi.fn(() => 1_700_000_000_000);
    const exchange = vi.fn<AdaptiveTurnRuntimeDeps["exchange"]>(async (request) => {
      expect(request.signal).toBeInstanceOf(AbortSignal);
      return {
        kind: "http",
        status: 429,
        headers: { "content-type": "application/json" },
        body: new TextEncoder().encode('{"error":"rate limited"}'),
      };
    });

    const response = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now,
      exchange,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      decision: { done: false },
      diagnostics: { source: "fallback", reason: "http_429" },
      turnToken: expect.any(String),
    });
    expect(now).toHaveBeenCalledTimes(1);
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["disabled", { enabled: false, turnSecret: TURN_SECRET }, 404, "Adaptive routing disabled"],
    ["missing credential", { enabled: true, turnSecret: TURN_SECRET }, 401, "Missing API key"],
    ["missing turn secret", { enabled: true }, 503, "Adaptive turn state unavailable"],
  ])("rejects %s before any provider exchange", async (_name, config, status, error) => {
    const exchange = vi.fn<AdaptiveTurnRuntimeDeps["exchange"]>();
    const request = _name === "missing credential"
      ? new Request("http://localhost/api/adaptive-turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
        })
      : adaptiveRequest({ subjectBrief: "原创游侠角色", history: [], precision: "simple" });

    const response = await handleAdaptiveTurnRequest(request, {
      enabled: config.enabled,
      turnSecret: "turnSecret" in config ? config.turnSecret : undefined,
      now: () => 1_700_000_000_000,
      exchange,
    });

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
    expect(exchange).not.toHaveBeenCalled();
  });

  it("issues the same signed Ask token for the same request and fixed clock", async () => {
    const exchange: AdaptiveTurnRuntimeDeps["exchange"] = async () => ({
      kind: "http",
      status: 503,
      headers: {},
      body: new Uint8Array(),
    });
    const run = async () => {
      const response = await handleAdaptiveTurnRequest(adaptiveRequest({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
      }), {
        enabled: true,
        turnSecret: TURN_SECRET,
        now: () => 1_700_000_000_000,
        exchange,
      });
      return response.json() as Promise<{ turnToken: string }>;
    };

    expect((await run()).turnToken).toBe((await run()).turnToken);
  });

  it("maps thrown transport details to one fixed network failure code", async () => {
    const onEvidence = vi.fn();
    const response = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      exchange: async () => {
        throw new TypeError("getaddrinfo ENOTFOUND secret-hostname");
      },
      onEvidence,
    });

    expect(await response.json()).toMatchObject({
      diagnostics: { source: "fallback", reason: "network_error" },
    });
    expect(onEvidence).toHaveBeenCalledWith({ failureCode: "network_error" });
  });

  it("aborts an in-flight provider exchange at the shared 30-second deadline", async () => {
    vi.useFakeTimers();
    let providerSignal: AbortSignal | undefined;
    const attemptLifecycle = {
      start: vi.fn(async () => ({ attemptId: "attempt-timeout", startedAt: 1_700_000_000_000 })),
      finish: vi.fn(async () => undefined),
    };
    const responsePromise = handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      attemptLifecycle,
      exchange: ({ signal }) => {
        providerSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(attemptLifecycle.start).toHaveBeenCalledTimes(1);
    expect(attemptLifecycle.finish).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    const response = await responsePromise;

    expect(providerSignal?.aborted).toBe(true);
    expect(await response.json()).toMatchObject({
      diagnostics: { source: "fallback", reason: "adaptive_turn_timeout" },
    });
    expect(attemptLifecycle.finish).toHaveBeenCalledWith(
      expect.any(Object),
      { outcome: "failure", failureCode: "adaptive_turn_timeout" },
    );
  });

  it("preserves raw provider evidence without changing a valid model decision", async () => {
    const rawBody = new TextEncoder().encode(JSON.stringify({
      choices: [{
        finish_reason: "length",
        message: { tool_calls: [{ function: { arguments: "raw-arguments" } }] },
      }],
    }));
    const onEvidence = vi.fn();
    const response = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      exchange: async () => ({ kind: "http", status: 200, headers: {}, body: rawBody }),
      onEvidence,
    });

    expect(await response.json()).toMatchObject({
      diagnostics: { source: "fallback", reason: "finish_reason" },
    });
    expect(onEvidence).toHaveBeenCalledWith({
      providerStatus: 200,
      rawBody,
      finishReason: "length",
      toolArgumentsRaw: "raw-arguments",
      failureCode: "finish_reason",
    });
  });

  it("accepts a 65,536-byte provider response but rejects 65,537 bytes", async () => {
    const run = async (size: number) => {
      const response = await handleAdaptiveTurnRequest(adaptiveRequest({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
      }), {
        enabled: true,
        turnSecret: TURN_SECRET,
        now: () => 1_700_000_000_000,
        exchange: async () => ({
          kind: "http",
          status: 200,
          headers: {},
          body: new Uint8Array(size).fill(120),
        }),
      });
      return response.json() as Promise<{ diagnostics: { reason: string } }>;
    };

    expect((await run(65_536)).diagnostics.reason).toBe("invalid_json");
    expect((await run(65_537)).diagnostics.reason).toBe("response_too_large");
  });

  it("allows a 65,536-byte provider request and rejects the next larger request before exchange", async () => {
    const acceptedExchange = vi.fn<AdaptiveTurnRuntimeDeps["exchange"]>(async ({ body }) => {
      expect(Buffer.byteLength(body, "utf8")).toBe(65_536);
      return { kind: "network", reason: "network_error" };
    });
    const accepted = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: `原创游侠角色${"x".repeat(17_184)}`,
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      exchange: acceptedExchange,
    });
    expect(accepted.status).toBe(200);
    expect(acceptedExchange).toHaveBeenCalledTimes(1);

    const rejectedExchange = vi.fn<AdaptiveTurnRuntimeDeps["exchange"]>();
    const rejected = await handleAdaptiveTurnRequest(adaptiveRequest({
      subjectBrief: `原创游侠角色${"x".repeat(17_185)}`,
      history: [],
      precision: "simple",
    }), {
      enabled: true,
      turnSecret: TURN_SECRET,
      now: () => 1_700_000_000_000,
      exchange: rejectedExchange,
    });
    expect(rejected.status).toBe(413);
    expect(await rejected.json()).toEqual({ error: "request_too_large" });
    expect(rejectedExchange).not.toHaveBeenCalled();
  });
});
