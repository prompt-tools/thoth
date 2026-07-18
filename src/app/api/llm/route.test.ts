import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { issueJourneyToken } from "@/lib/prompt/agent/journey-state";

const SECRET = "a-strong-test-secret-with-at-least-32-bytes";

function signedJourney() {
  return {
    id: "journey-1",
    token: issueJourneyToken({
      secret: SECRET,
      journeyId: "journey-1",
      release: "release-a",
      route: "fixed",
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      state: { kind: "done" },
      now: 1_700_000_000_000,
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/llm", () => {
  it("rejects an empty bearer credential without contacting the provider", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer " },
        body: { messages: [] },
      }),
    }));

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a non-string authorization header", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: 1 },
        body: { messages: [] },
      }),
    }));

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects demo-key requests outside the fixed chat-completions endpoint", async () => {
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/v1/models",
        headers: { authorization: "Bearer __demo__" },
        body: {},
      }),
    }));

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("overrides demo model and token budget on the server", async () => {
    vi.useFakeTimers();
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    vi.setSystemTime(1_700_000_000_000);
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        return Response.json({ result: command[2] === "1" ? "created" : "written" });
      }
      return new Response("{}", { headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchSpy);

    await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { model: "expensive-model", max_tokens: 99999, messages: [] },
        journey: signedJourney(),
      }),
    }));

    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      "https://example.upstash.io",
      "https://api.deepseek.com/chat/completions",
      "https://example.upstash.io",
    ]);
    const [, init] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "deepseek-v4-flash",
      max_tokens: 512,
      thinking: { type: "disabled" },
    });
    expect(JSON.parse(init.body as string)).not.toHaveProperty("journey");
  });

  it("records an HTTP failure while preserving the provider response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    let terminal: unknown;
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminal = JSON.parse(command[5]);
        return Response.json({ result: "written" });
      }
      return new Response(JSON.stringify({ error: "quota" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { messages: [] },
        journey: signedJourney(),
      }),
    }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "quota" });
    expect(terminal).toEqual(expect.objectContaining({
      outcome: "failure",
      failureCode: "http_429",
      providerStatus: 429,
    }));
  });

  it("rejects a Built-in provider call without a valid signed Journey", async () => {
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { messages: [] },
      }),
    }));

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never persists provider-controlled content disguised as usage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    let terminal: unknown;
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminal = JSON.parse(command[5]);
        return Response.json({ result: "written" });
      }
      return new Response(JSON.stringify({
        usage: {
          prompt_tokens: { raw: "SUBJECT_CONTENT" },
          completion_tokens: "TOOL_ARGUMENTS",
        },
      }));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { messages: [] },
        journey: signedJourney(),
      }),
    }));

    expect(response.status).toBe(200);
    expect(terminal).toEqual(expect.objectContaining({ outcome: "success" }));
    expect(terminal).not.toHaveProperty("usage");
    expect(JSON.stringify(terminal)).not.toMatch(/SUBJECT_CONTENT|TOOL_ARGUMENTS/);
  });

  it("records caller cancellation for a signed Built-in secondary call", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const caller = new AbortController();
    let providerSignal: AbortSignal | undefined;
    let terminal: unknown;
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminal = JSON.parse(command[5]);
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
    const responsePromise = POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { messages: [] },
        journey: signedJourney(),
      }),
      signal: caller.signal,
    }));

    await vi.waitFor(() => expect(providerSignal).toBeDefined());
    caller.abort();
    const response = await responsePromise;

    expect(response.status).toBe(502);
    expect(providerSignal?.aborted).toBe(true);
    expect(terminal).toEqual(expect.objectContaining({
      outcome: "failure",
      failureCode: "provider_cancelled",
    }));
  });

  it("classifies cancellation while reading a Built-in response body", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    const caller = new AbortController();
    let terminal: unknown;
    let responseStarted = false;
    const fetchSpy = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "https://example.upstash.io") {
        const command = JSON.parse(String(init?.body)) as string[];
        if (command[2] === "1") return Response.json({ result: "created" });
        terminal = JSON.parse(command[5]);
        return Response.json({ result: "written" });
      }
      const providerSignal = init?.signal as AbortSignal;
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
    const responsePromise = POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { messages: [] },
        journey: signedJourney(),
      }),
      signal: caller.signal,
    }));

    await vi.waitFor(() => expect(responseStarted).toBe(true));
    caller.abort();
    const response = await responsePromise;

    expect(response.status).toBe(502);
    expect(terminal).toEqual(expect.objectContaining({
      outcome: "failure",
      failureCode: "provider_cancelled",
    }));
  });

  it("enforces the request ceiling in UTF-8 bytes", async () => {
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { messages: [{ role: "user", content: "界".repeat(22_000) }] },
      }),
    }));

    expect(response.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
