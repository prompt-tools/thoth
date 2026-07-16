import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
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
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", {
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchSpy);

    await POST(new Request("http://localhost/api/llm", {
      method: "POST",
      body: JSON.stringify({
        endpoint: "https://api.deepseek.com/chat/completions",
        headers: { authorization: "Bearer __demo__" },
        body: { model: "expensive-model", max_tokens: 99999, messages: [] },
      }),
    }));

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "deepseek-v4-flash",
      max_tokens: 512,
      thinking: { type: "disabled" },
    });
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
