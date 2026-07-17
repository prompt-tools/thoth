import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/journey-turn", () => {
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
        return Response.json({ result: command[1].includes("PEXPIREAT") ? "created" : "written" });
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
        return Response.json({ result: command[1].includes("PEXPIREAT") ? "created" : "written" });
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
        if (command[1].includes("PEXPIREAT")) {
          startedIds.push((JSON.parse(command[4]) as { attemptId: string }).attemptId);
          return Response.json({ result: "created" });
        }
        terminals.push(JSON.parse(command[4]) as Record<string, unknown>);
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
});
