import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCatalogManifest } from "@/lib/prompt/agent/catalog-manifest";
import { POST } from "./route";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/adaptive-turn", () => {
  it("accepts a model-selected Eligible dimension instead of ordered[0]", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const sceneIds = buildCatalogManifest()
      .find((dimension) => dimension.questionId === "scene")!
      .options.slice(0, 3)
      .map((option) => option.id);
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: "scene",
                questionText: "这位雨夜侦探身后的环境更偏哪种叙事空间？",
                helperText: "背景会决定这张小说封面的故事张力。",
                optionIds: sceneIds,
              }),
            },
          }],
        },
      }],
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "赛博朋克女侦探，雨夜霓虹，小说封面",
        history: [],
        precision: "simple",
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      decision: { nextQuestionId: "scene", visibleOptionIds: sceneIds, done: false },
      diagnostics: { source: "model" },
    });

    const [endpoint, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const upstream = JSON.parse(init.body as string);
    const modelInput = JSON.parse(upstream.messages[1].content);
    expect(endpoint).toBe("https://api.deepseek.com/chat/completions");
    expect(upstream).toMatchObject({
      model: "deepseek-v4-flash",
      max_tokens: 512,
      stream: false,
      thinking: { type: "disabled" },
    });
    expect(modelInput.eligibleDimensions.length).toBeGreaterThan(1);
    expect(modelInput.eligibleDimensions.map((dimension: { questionId: string }) => dimension.questionId))
      .not.toContain("subject");
    expect(modelInput.eligibleDimensions.every((dimension: Record<string, unknown>) =>
      Array.isArray(dimension.candidates) && !("options" in dimension)))
      .toBe(true);
  });

  it("rejects the entire model Ask when one option is outside its dimension", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const manifest = buildCatalogManifest();
    const sceneIds = manifest.find((dimension) => dimension.questionId === "scene")!
      .options.slice(0, 3)
      .map((option) => option.id);
    const wrongDimensionId = manifest.find((dimension) => dimension.questionId === "lighting")!.options[0].id;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: "scene",
                questionText: "背景是什么？",
                helperText: "选择叙事空间。",
                optionIds: [sceneIds[0], sceneIds[1], wrongDimensionId],
              }),
            },
          }],
        },
      }],
    }))));

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "雨夜女侦探小说封面", history: [], precision: "simple" }),
    }));
    const result = await response.json();

    expect(result).toMatchObject({
      decision: { nextQuestionId: "framing", done: false },
      diagnostics: { source: "fallback", reason: "option_allowlist" },
    });
    expect(result.decision.visibleOptionIds).toHaveLength(4);
    expect(result.decision.visibleOptionIds).not.toContain(wrongDimensionId);
  });

  it("rejects a history that has exhausted the 10-turn sparse budget before calling DeepSeek", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const history = buildCatalogManifest()
      .filter((dimension) => dimension.questionId !== "subject")
      .slice(0, 10)
      .map((dimension) => ({
        questionId: dimension.questionId,
        selectedOptionIds: [dimension.options[0].id],
      }));

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "雨夜女侦探小说封面", history, precision: "simple" }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "history_budget_exhausted" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("applies the 30-second deadline to inbound JSON parsing too", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const request = {
      headers: new Headers({ authorization: "Bearer __demo__" }),
      json: () => new Promise((resolve) => {
        setTimeout(() => resolve({ subjectBrief: "雨夜女侦探", history: [], precision: "simple" }), 31_000);
      }),
    } as Request;

    let response: Response | undefined;
    void POST(request).then((value) => { response = value; });
    await vi.advanceTimersByTimeAsync(30_000);

    expect(response?.status).toBe(408);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
