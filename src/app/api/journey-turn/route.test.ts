import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { buildAdaptiveTurnSnapshot } from "@/lib/prompt/agent/adaptive-turn";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/journey-turn", () => {
  it("falls back to a local release when Vercel exposes blank git metadata", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", " ");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", " ");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "attempt_store_unavailable" });
  });

  it("fails closed before DeepSeek when the durable attempt store is not configured", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "attempt_store_unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wires zero exposure to the existing fixed DeepSeek path", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        return Response.json({ result: command[2] === "1" ? "created" : "written" });
      }
      return new Response("{}");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
      }),
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.journey).toMatchObject({ route: "fixed", token: expect.any(String) });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      "https://example.upstash.io",
      "https://api.deepseek.com/chat/completions",
      "https://example.upstash.io",
    ]);
  });

  it.each(["url", "token", "incomplete"] as const)("keeps content-free Journey routing on while disabling raw Redis with a shared or %s config", async (field) => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    vi.stubEnv("RAW_CONTENT_SAMPLING_ENABLED", "1");
    vi.stubEnv("RAW_CONTENT_RETENTION_VERIFIED", "1");
    vi.stubEnv(
      "RAW_CONTENT_REDIS_REST_URL",
      field === "url" ? "https://example.upstash.io/" : "https://raw.example.upstash.io",
    );
    vi.stubEnv(
      "RAW_CONTENT_REDIS_REST_TOKEN",
      field === "token" ? "redis-token" : field === "incomplete" ? "" : "raw-token",
    );
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        return Response.json({ result: command[2] === "1" ? "created" : "written" });
      }
      return new Response("{}");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
        journeyId: "00000000-0000-4000-8000-00000000000d",
        rawContentConsent: true,
      }),
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      journey: { route: "fixed" },
      rawContentEligible: false,
    });
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      "https://example.upstash.io",
      "https://api.deepseek.com/chat/completions",
      "https://example.upstash.io",
    ]);
  });

  it("continues a fixed Journey through the production route with its latest token", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        return Response.json({ result: command[2] === "1" ? "created" : "written" });
      }
      return new Response("{}");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const subjectBrief = "原创游侠角色";
    const first = await (await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief, history: [], precision: "simple" }),
    }))).json();
    const history = [{
      questionId: first.decision.nextQuestionId,
      selectedOptionIds: [first.decision.visibleOptionIds[0]],
    }];

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief,
        history,
        precision: "simple",
        journeyId: first.journey.id,
        journeyToken: first.journey.token,
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      journey: { id: first.journey.id, route: "fixed", token: expect.any(String) },
      decision: { done: false },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  it("records every fixed HTTP failure before returning the existing fallback", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const startedIds: string[] = [];
    const terminals: Array<Record<string, unknown>> = [];
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") {
          startedIds.push((JSON.parse(command[4]) as { attemptId: string }).attemptId);
          return Response.json({ result: "created" });
        }
        terminals.push(JSON.parse(command[5]) as Record<string, unknown>);
        return Response.json({ result: "written" });
      }
      return new Response("unavailable", { status: 503 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ diagnostics: { source: "fallback", attempts: 3 } });
    expect(new Set(startedIds).size).toBe(3);
    expect(terminals).toEqual(Array.from({ length: 3 }, () => expect.objectContaining({
      outcome: "failure",
      failureCode: "http_503",
      providerStatus: 503,
    })));
  });

  it("propagates caller cancellation to the fixed provider and records one cancelled attempt", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const caller = new AbortController();
    const providerSignals: AbortSignal[] = [];
    const terminals: Array<Record<string, unknown>> = [];
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminals.push(JSON.parse(command[5]) as Record<string, unknown>);
        return Response.json({ result: "written" });
      }
      const providerSignal = init?.signal as AbortSignal;
      providerSignals.push(providerSignal);
      if (caller.signal.aborted) return new Response("caller cancelled", { status: 503 });
      return new Promise<Response>((resolve, reject) => {
        providerSignal.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
        caller.signal.addEventListener("abort", () => {
          resolve(new Response("caller cancelled", { status: 503 }));
        }, { once: true });
      });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const responsePromise = POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
      signal: caller.signal,
    }));

    await vi.waitFor(() => expect(providerSignals).toHaveLength(1));
    caller.abort();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(providerSignals[0].aborted).toBe(true);
    expect(providerSignals).toHaveLength(1);
    expect(terminals).toEqual([expect.objectContaining({
      outcome: "failure",
      failureCode: "provider_cancelled",
    })]);
  });

  it("classifies cancellation while reading a fixed response body without retrying", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const caller = new AbortController();
    const terminals: Array<Record<string, unknown>> = [];
    let providerCalls = 0;
    let responseStarted = false;
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminals.push(JSON.parse(command[5]) as Record<string, unknown>);
        return Response.json({ result: "written" });
      }
      providerCalls += 1;
      const providerSignal = init?.signal as AbortSignal;
      if (providerSignal.aborted) throw new DOMException("aborted", "AbortError");
      return new Response(new ReadableStream({
        start(controller) {
          responseStarted = true;
          providerSignal.addEventListener("abort", () => {
            controller.error(new DOMException("aborted", "AbortError"));
          }, { once: true });
        },
      }));
    });
    vi.stubGlobal("fetch", fetchSpy);
    const responsePromise = POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
      signal: caller.signal,
    }));

    await vi.waitFor(() => expect(responseStarted).toBe(true));
    caller.abort();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(providerCalls).toBe(1);
    expect(terminals).toEqual([expect.objectContaining({
      outcome: "failure",
      failureCode: "provider_cancelled",
    })]);
  });

  it("records an Adaptive production call from Started through validated Ask", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "100");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    });
    const dimension = snapshot.eligibleDimensions[0];
    const events: string[] = [];
    const terminals: Array<Record<string, unknown>> = [];
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") {
          events.push("started");
          return Response.json({ result: "created" });
        }
        events.push("terminal");
        terminals.push(JSON.parse(command[5]) as Record<string, unknown>);
        return Response.json({ result: "written" });
      }
      events.push("provider");
      return new Response(JSON.stringify({
        choices: [{
          finish_reason: "tool_calls",
          message: { tool_calls: [{ function: {
            name: "decide_adaptive_turn",
            arguments: JSON.stringify({
              done: false,
              nextQuestionId: dimension.questionId,
              questionText: dimension.title,
              helperText: dimension.helper,
              optionIds: dimension.candidates.slice(0, 3).map((option) => option.id),
            }),
          } }] },
        }],
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ journey: { route: "adaptive" } });
    expect(events).toEqual(["started", "provider", "terminal"]);
    expect(terminals).toEqual([expect.objectContaining({
      outcome: "success",
      validation: "ask",
    })]);
  });

  it("propagates caller cancellation through the Adaptive production exchange", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "100");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const caller = new AbortController();
    let providerSignal: AbortSignal | undefined;
    const terminals: Array<Record<string, unknown>> = [];
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminals.push(JSON.parse(command[5]) as Record<string, unknown>);
        return Response.json({ result: "written" });
      }
      providerSignal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        providerSignal!.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
      });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const responsePromise = POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
      signal: caller.signal,
    }));

    await vi.waitFor(() => expect(providerSignal).toBeDefined());
    caller.abort();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(providerSignal?.aborted).toBe(true);
    expect(terminals).toEqual([expect.objectContaining({
      outcome: "failure",
      failureCode: "provider_cancelled",
    })]);
  });

  it("records a provider-validated Adaptive Completion at the production boundary", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "100");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const terminals: Array<Record<string, unknown>> = [];
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminals.push(JSON.parse(command[5]) as Record<string, unknown>);
        return Response.json({ result: "written" });
      }
      return new Response(JSON.stringify({
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
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "女船长怒视镜头，低机位，电影海报",
        history: [],
        precision: "simple",
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ decision: { done: true } });
    expect(terminals).toEqual([expect.objectContaining({
      outcome: "success",
      validation: "completion",
    })]);
  });
});
