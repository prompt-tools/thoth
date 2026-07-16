import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCatalogManifest } from "@/lib/prompt/agent/catalog-manifest";
import { issueAcceptedAskToken } from "@/lib/prompt/agent/adaptive-turn-state";
import { POST } from "./route";

const TURN_SECRET = "a-strong-test-secret-with-at-least-32-bytes";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/adaptive-turn", () => {
  it("accepts a model-selected Eligible dimension instead of ordered[0]", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
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

  it("completes a detailed signed Ask-to-Answer journey after preserving the accepted history", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
    const framingIds = buildCatalogManifest()
      .find((dimension) => dimension.questionId === "framing")!
      .options.slice(0, 3)
      .map((option) => option.id);
    const ask = new Response(JSON.stringify({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: "framing",
                questionText: "这位窗边女学生更适合哪种取景范围？",
                helperText: "取景会决定人物、窗景和午后光线各自占据多少画面。",
                optionIds: framingIds,
              }),
            },
          }],
        },
      }],
    }));
    const completion = new Response(JSON.stringify({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: true,
                nextQuestionId: null,
                questionText: null,
                helperText: null,
                optionIds: [],
              }),
            },
          }],
        },
      }],
    }));
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(ask)
      .mockResolvedValueOnce(completion);
    vi.stubGlobal("fetch", fetchSpy);
    const subjectBrief = "二次元女学生坐在教室窗边，午后阳光，看向窗外";

    const firstResponse = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief, history: [], precision: "simple" }),
    }));
    const first = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(first).toMatchObject({
      decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
      diagnostics: { source: "model" },
      turnToken: expect.any(String),
    });

    const acceptedHistory = [{ questionId: "framing", selectedOptionIds: [framingIds[0]] }];
    const secondResponse = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief, history: acceptedHistory, precision: "simple", turnToken: first.turnToken }),
    }));

    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toEqual({
      decision: {
        nextQuestionId: null,
        questionText: null,
        helperText: null,
        visibleOptionIds: [],
        done: true,
      },
      diagnostics: { source: "model" },
    });
    const secondProviderBody = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    const secondSnapshot = JSON.parse(secondProviderBody.messages[1].content);
    expect(secondSnapshot.history).toEqual(acceptedHistory);
    expect(secondSnapshot.coveredPillars).toEqual([
      "characterSignature",
      "narrativeBehavior",
      "visualWorld",
      "presentationPurpose",
    ]);
    expect(secondSnapshot.completionEligible).toBe(true);
  });

  it("rejects the entire model Ask when one option is outside its dimension", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
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

  it("rejects a premature model Completion for an explicitly unresolved background", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
    const completionPayload = {
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: true,
                nextQuestionId: null,
                questionText: null,
                helperText: null,
                optionIds: [],
              }),
            },
          }],
        },
      }],
    };
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(completionPayload)))
      .mockResolvedValueOnce(new Response(JSON.stringify(completionPayload)));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "女船长怒视镜头，低机位，背景还没想好，电影海报",
        history: [],
        precision: "simple",
      }),
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      decision: { nextQuestionId: "scene", done: false },
      diagnostics: { source: "fallback", reason: "premature_completion" },
      turnToken: expect.any(String),
    });

    const secondResponse = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "女船长怒视镜头，低机位，背景还没想好，电影海报",
        history: [{ questionId: "scene", selectedOptionIds: [result.decision.visibleOptionIds[0]] }],
        precision: "simple",
        turnToken: result.turnToken,
      }),
    }));

    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toEqual({
      decision: {
        nextQuestionId: null,
        questionText: null,
        helperText: null,
        visibleOptionIds: [],
        done: true,
      },
      diagnostics: { source: "model" },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps an explicit white background out of a sparse route request", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
    const framingIds = buildCatalogManifest()
      .find((dimension) => dimension.questionId === "framing")!
      .options.slice(0, 3)
      .map((option) => option.id);
    const providerResponse = {
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: "framing",
                questionText: "这张职业头像更适合哪种取景范围？",
                helperText: "取景范围会影响职业头像的正式感与亲近感。",
                optionIds: framingIds,
              }),
            },
          }],
        },
      }],
    };
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerResponse)));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "用于求职简历的职业头像，白色背景，正式可信",
        history: [],
        precision: "simple",
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      decision: { nextQuestionId: "framing", done: false },
      diagnostics: { source: "model" },
    });
    const providerBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    const snapshot = JSON.parse(providerBody.messages[1].content);
    expect(snapshot.budget).toMatchObject({ class: "sparse", limit: 10 });
    expect(snapshot.eligibleDimensions.map((dimension: { questionId: string }) => dimension.questionId))
      .not.toContain("scene");
  });

  it("rejects a history that has exhausted the 10-turn sparse budget before calling DeepSeek", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const history = buildCatalogManifest()
      .filter((dimension) => dimension.questionId !== "subject")
      .slice(0, 10)
      .map((dimension) => ({
        questionId: dimension.questionId,
        selectedOptionIds: [dimension.options[0].id],
      }));
    const last = history.at(-1)!;
    const turnToken = issueAcceptedAskToken({
      secret: TURN_SECRET,
      subjectBrief: "原创游侠角色",
      history: history.slice(0, -1),
      questionId: last.questionId,
      optionIds: last.selectedOptionIds,
      mode: "multi",
    });

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history, precision: "simple", turnToken }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "history_budget_exhausted" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("applies the 30-second deadline to inbound JSON parsing too", async () => {
    vi.useFakeTimers();
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
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

  it("returns a legal zero-turn remainingEmpty Completion without calling DeepSeek", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "32岁、古铜色自然皮肤、高挑强健、红色长卷发、左眼眼罩和下颌疤痕、无妆感的女船长，穿黑色皮革长外套与金属肩甲，握弯刀怒视镜头，双腿站稳在暴风雨甲板上，低机位 35mm 全身竖版 2:3 海报构图，蓝绿色冷色调电影光效与雨雾，史诗紧张氛围，电影级高细节写实 3D 手游主视觉",
        history: [],
        precision: "simple",
      }),
    }));

    expect(await response.json()).toMatchObject({
      decision: {
        done: true,
        nextQuestionId: null,
        questionText: null,
        helperText: null,
        visibleOptionIds: [],
      },
      diagnostics: { source: "remainingEmpty" },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a later answer that was not selected from the previously accepted Ask", async () => {
    vi.stubEnv("ADAPTIVE_ROUTING_ENABLED", "1");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    vi.stubEnv("ADAPTIVE_TURN_SECRET", TURN_SECRET);
    const scene = buildCatalogManifest().find((dimension) => dimension.questionId === "scene")!;
    const shownIds = scene.options.slice(0, 3).map((option) => option.id);
    const hiddenButCatalogValidId = scene.options[4].id;
    const framingIds = buildCatalogManifest()
      .find((dimension) => dimension.questionId === "framing")!
      .options.slice(0, 3)
      .map((option) => option.id);
    const firstAsk = new Response(JSON.stringify({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: "scene",
                questionText: "这位游侠身处怎样的世界？",
                helperText: "背景会决定角色的故事语境。",
                optionIds: shownIds,
              }),
            },
          }],
        },
      }],
    }));
    const secondAsk = new Response(JSON.stringify({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          tool_calls: [{
            function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: "framing",
                questionText: "这位游侠更适合哪种取景范围？",
                helperText: "取景范围会决定人物与世界环境的叙事比例。",
                optionIds: framingIds,
              }),
            },
          }],
        },
      }],
    }));
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(firstAsk)
      .mockResolvedValueOnce(secondAsk);
    vi.stubGlobal("fetch", fetchSpy);

    const firstResponse = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief: "原创游侠角色", history: [], precision: "simple" }),
    }));
    const first = await firstResponse.json();
    expect(first.turnToken).toEqual(expect.any(String));

    const tamperedResponse = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "原创游侠角色",
        history: [{ questionId: "scene", selectedOptionIds: [hiddenButCatalogValidId] }],
        precision: "simple",
        turnToken: first.turnToken,
      }),
    }));

    expect(tamperedResponse.status).toBe(400);
    expect(await tamperedResponse.json()).toEqual({ error: "invalid_turn_state" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const validResponse = await POST(new Request("http://localhost/api/adaptive-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "原创游侠角色",
        history: [{ questionId: "scene", selectedOptionIds: [shownIds[0]] }],
        precision: "simple",
        turnToken: first.turnToken,
      }),
    }));
    const valid = await validResponse.json();

    expect(validResponse.status).toBe(200);
    expect(valid).toMatchObject({
      decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
      diagnostics: { source: "model" },
    });
    expect(valid.turnToken).toEqual(expect.any(String));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondProviderBody = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    const secondSnapshot = JSON.parse(secondProviderBody.messages[1].content);
    expect(secondSnapshot).toMatchObject({
      budget: { class: "sparse", limit: 10, used: 1, remaining: 9 },
      history: [{ questionId: "scene", selectedOptionIds: [shownIds[0]] }],
    });
  });
});
