import { describe, it, expect, vi } from "vitest";
import "../init";
import {
  buildTurnRequest,
  extractUsage,
  parseTurnResponse,
  ProviderTransportError,
  requestAdaptiveTurn,
  runAgentTurn,
} from "./client";
import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";
import { activeDimensions } from "./active-dimensions";
import { getProvider } from "./providers";

const manifest = buildCatalogManifest();
const provider = getProvider("deepseek");

function makeResp(visibleOptionIds: string[]) {
  return {
    choices: [{
      message: {
        tool_calls: [{
          function: {
            name: "select_options",
            arguments: JSON.stringify({ visibleOptionIds, helperText: "请选择" }),
          },
        }],
      },
    }],
  };
}

function sequenceTransport(responses: unknown[]) {
  let i = 0;
  return async () => {
    if (i >= responses.length) throw new Error("transport: no more responses");
    return responses[i++];
  };
}


describe("buildTurnRequest (C-9b gradient)", () => {
  it("nextQuestionId = ordered[0] from activeDimensions", () => {
    const { ctx } = buildTurnRequest(provider, "test-key", { manifest, history: [], userDescription: "" });
    const { ordered } = activeDimensions("人像", "simple", []);
    expect(ctx.currentQuestionId).toBe(ordered[0]);
    expect(ctx.remainingEmpty).toBe(false);
    expect(ctx.type).toBe("人像");
    expect(ctx.precision).toBe("simple");
  });

  it("routes to 人像 when description contains person signal", () => {
    const { ctx } = buildTurnRequest(provider, "test-key", { manifest, history: [], userDescription: "一个女生" });
    expect(ctx.type).toBe("人像");
  });

  it("precision=standard expands pool", () => {
    const { ctx: simple } = buildTurnRequest(provider, "test-key", { manifest, history: [], precision: "simple" });
    const { ctx: standard } = buildTurnRequest(provider, "test-key", { manifest, history: [], precision: "standard" });
    expect(standard.pool.length).toBeGreaterThanOrEqual(simple.pool.length);
  });
});

describe("runAgentTurn (C-9b gradient)", () => {
  it("never treats provider-controlled non-numeric usage as telemetry", () => {
    expect(extractUsage({
      usage: {
        prompt_tokens: { raw: "SUBJECT_CONTENT" },
        completion_tokens: "TOOL_ARGUMENTS",
      },
    })).toBeUndefined();
    expect(extractUsage({
      usage: { prompt_tokens: -1, completion_tokens: Number.POSITIVE_INFINITY },
    })).toBeUndefined();
  });

  it("records malformed fixed tool output as validation failure while preserving the safe UI fallback", async () => {
    const finish = vi.fn(async () => undefined);
    const { decision } = await runAgentTurn(
      provider,
      "test-key",
      { manifest, history: [], userDescription: "" },
      async () => ({}),
      {
        attemptLifecycle: {
          start: async () => ({ attemptId: "attempt-invalid", startedAt: 1 }),
          finish,
        },
      },
    );

    expect(decision.done).toBe(false);
    expect(decision.visibleOptionIds.length).toBeGreaterThan(0);
    expect(finish).toHaveBeenCalledWith(
      expect.any(Object),
      { outcome: "failure", failureCode: "validation_no_valid_options" },
    );
  });

  it("terminalizes a null provider document as validation failure", async () => {
    const finish = vi.fn(async () => undefined);
    const result = await runAgentTurn(
      provider,
      "test-key",
      { manifest, history: [], userDescription: "" },
      async () => null,
      {
        attemptLifecycle: {
          start: async () => ({ attemptId: "attempt-null", startedAt: 1 }),
          finish,
        },
      },
    );

    expect(result.decision.done).toBe(false);
    expect(finish).toHaveBeenCalledWith(
      expect.any(Object),
      { outcome: "failure", failureCode: "validation_no_valid_options" },
    );
  });

  // ① pool = activeDimensions, nextQuestionId = ordered[0]
  it("① nextQuestionId === ordered[0]", async () => {
    const dim = manifest.find((d) => d.questionId === "subject")!;
    const resp = makeResp(dim.options.slice(0, 3).map((o) => o.id));

    const { decision, ctx } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "" },
      sequenceTransport([resp])
    );

    const { ordered } = activeDimensions(ctx.type, "simple", []);
    expect(decision.nextQuestionId).toBe(ordered[0]);
    expect(decision.done).toBe(false);
  });

  // ② model returns done=true → ignored
  it("② model done=true is ignored (done is runtime-determined)", async () => {
    const dim = manifest.find((d) => d.questionId === "subject")!;
    // Model tries to return done=true via visibleOptionIds + done
    const resp = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "select_options",
              arguments: JSON.stringify({ visibleOptionIds: dim.options.slice(0, 2).map(o => o.id), helperText: "test", done: true }),
            },
          }],
        },
      }],
    };

    const { decision } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "" },
      sequenceTransport([resp])
    );

    // done should be false because ordered is not empty
    expect(decision.done).toBe(false);
  });

  // ③ ordered empty → done=true
  it("③ all dimensions asked → done=true", async () => {
    // Fill all dimensions
    const fullHistory: AgentHistoryItem[] = manifest.map((d) => ({
      questionId: d.questionId,
      selectedOptionIds: [d.options[0].id],
    }));

    const { decision, diagnostics } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: fullHistory },
      sequenceTransport([])
    );

    expect(decision.done).toBe(true);
    expect(diagnostics.source).toBe("remainingEmpty");
  });

  // ④ model returns invalid visibleOptionIds → fallback to ALL options
  it("④ invalid visibleOptionIds → fallback to all dimension options", async () => {
    const resp = makeResp(["image_fake:nonexistent", "image_fake:also_fake"]);

    const { decision } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "" },
      sequenceTransport([resp])
    );

    // Should fall back to ALL options for the current dimension
    const { ordered } = activeDimensions("人像", "simple", []);
    const currentDim = manifest.find((d) => d.questionId === ordered[0])!;
    expect(decision.visibleOptionIds).toEqual(currentDim.options.map((o) => o.id));
    expect(decision.done).toBe(false);
  });

  // transport error → fallback
  it("transport error → fallback to all dimension options", async () => {
    const transport = async () => { throw new Error("connection refused"); };

    const { decision, diagnostics } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "" },
      transport
    );

    expect(decision.done).toBe(false);
    expect(diagnostics.fallbackUsed).toBe(true);
    expect(diagnostics.source).toBe("fallback");
  });

  it("does not retry a deterministic oversized provider request", async () => {
    const transport = vi.fn(async () => {
      throw new ProviderTransportError("request_too_large");
    });
    const start = vi.fn(async () => ({ attemptId: "attempt-1", startedAt: 1 }));
    const finish = vi.fn(async () => undefined);

    const { diagnostics } = await runAgentTurn(
      provider,
      "test-key",
      { manifest, history: [], userDescription: "" },
      transport,
      { attemptLifecycle: { start, finish } },
    );

    expect(transport).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: "attempt-1" }),
      { outcome: "failure", failureCode: "request_too_large" },
    );
    expect(diagnostics).toMatchObject({ source: "fallback", attempts: 1 });
  });

  // ⑥ Portrait-only subject pre-filter — model only receives people options
  it("⑥ pure animal description still receives only portrait subject options", async () => {
    let capturedOptions: string[] = [];
    const transport = async (req: unknown) => {
      const body = (req as { body: Record<string, unknown> }).body;
      const messages = body.messages as Array<{ role: string; content: string }>;
      const systemText = messages.find(m => m.role === "system")?.content ?? "";
      // Extract only the JSON options list after "可选选项：\n"
      const match = systemText.match(/可选选项：\n(\[[\s\S]*?\](?=\n|$))/);
      if (match) {
        const opts = JSON.parse(match[1]) as Array<{ id: string }>;
        capturedOptions = opts.map(o => o.id);
      }
      return makeResp(["image_subject:beautiful_woman"]);
    };

    await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "橘色小猫" },
      transport
    );

    expect(capturedOptions).toContain("image_subject:single_person");
    expect(capturedOptions).toContain("image_subject:beautiful_woman");
    expect(capturedOptions).toContain("image_subject:otome_character");
    expect(capturedOptions).not.toContain("image_subject:pet_animal");
    expect(capturedOptions).not.toContain("image_subject:food_beverage");
  });

  // ⑦ fallback: invalid options → falls back to portrait subject set, not full catalog
  it("⑦ subject fallback uses portrait options, not non-portrait catalog", async () => {
    const { decision } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "橘色小猫" },
      async () => makeResp(["image_fake:nonexistent"])
    );

    expect(decision.visibleOptionIds).toContain("image_subject:single_person");
    expect(decision.visibleOptionIds).toContain("image_subject:beautiful_woman");
    expect(decision.visibleOptionIds).toContain("image_subject:handsome_man");
    expect(decision.visibleOptionIds).not.toContain("image_subject:pet_animal");
    expect(decision.visibleOptionIds).not.toContain("image_subject:food_beverage");
  });

  it("drops non-portrait subject ids when the model mixes them with valid ids", async () => {
    const { decision } = await runAgentTurn(
      provider,
      "test-key",
      { manifest, history: [], userDescription: "橘色小猫" },
      async () => makeResp(["image_subject:pet_animal", "image_subject:beautiful_woman"]),
    );

    expect(decision.visibleOptionIds).toEqual(["image_subject:beautiful_woman"]);
  });
});

describe("parseTurnResponse (C-9b)", () => {
  it("extracts visibleOptionIds from select_options tool", () => {
    const { ctx } = buildTurnRequest(provider, "test-key", { manifest, history: [] });
    const currentDim = manifest.find((d) => d.questionId === ctx.currentQuestionId)!;
    const resp = makeResp(currentDim.options.slice(0, 3).map((o) => o.id));
    const result = parseTurnResponse(provider, resp, ctx);
    expect(result.decision).not.toBeNull();
    expect(result.decision!.visibleOptionIds.length).toBe(3);
  });

  it("drops invalid option ids", () => {
    const { ctx } = buildTurnRequest(provider, "test-key", { manifest, history: [] });
    const currentDim = manifest.find((d) => d.questionId === ctx.currentQuestionId)!;
    const resp = makeResp([...currentDim.options.slice(0, 2).map((o) => o.id), "image_fake:bad"]);
    const result = parseTurnResponse(provider, resp, ctx);
    expect(result.droppedInvalidOptionIds).toContain("image_fake:bad");
    expect(result.decision!.visibleOptionIds).not.toContain("image_fake:bad");
  });
});

describe("requestAdaptiveTurn", () => {
  it("sends only the Subject brief, history, precision, and credential", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      decision: {
        nextQuestionId: "scene",
        questionText: "背景在哪里？",
        helperText: "选择叙事空间。",
        visibleOptionIds: ["a", "b", "c"],
        done: false,
      },
      diagnostics: { source: "model" },
      turnToken: "signed-ask",
    })));

    const result = await requestAdaptiveTurn("secret", {
      subjectBrief: "雨夜女侦探",
      history: [],
      precision: "simple",
    }, fetcher);

    expect(result.decision.nextQuestionId).toBe("scene");
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/adaptive-turn");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer secret");
    expect(JSON.parse(init.body as string)).toEqual({
      subjectBrief: "雨夜女侦探",
      history: [],
      precision: "simple",
    });
  });

  it("carries the server-issued turn token on a later answer", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      decision: {
        nextQuestionId: null,
        questionText: null,
        helperText: null,
        visibleOptionIds: [],
        done: true,
      },
      diagnostics: { source: "model" },
    })));

    await requestAdaptiveTurn("secret", {
      subjectBrief: "雨夜女侦探",
      history: [{ questionId: "scene", selectedOptionIds: ["image_scene:urban_street"] }],
      precision: "simple",
      turnToken: "signed-ask",
    }, fetcher);

    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ turnToken: "signed-ask" });
  });

  it("rejects a success response that is not the exact Adaptive shape", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      decision: {
        nextQuestionId: "scene",
        questionText: "背景在哪里？",
        visibleOptionIds: ["a", "b", "c"],
        done: false,
      },
      diagnostics: { source: "model" },
      turnToken: "signed-ask",
    })));

    await expect(requestAdaptiveTurn("secret", {
      subjectBrief: "雨夜女侦探",
      history: [],
      precision: "simple",
    }, fetcher)).rejects.toMatchObject({
      name: "AdaptiveRouteError",
      code: "adaptive_route_invalid_payload",
    });
  });

  it("throws a typed route error for a hard HTTP failure", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "history_budget_exhausted" }),
      { status: 409 },
    ));

    await expect(requestAdaptiveTurn("secret", {
      subjectBrief: "雨夜女侦探",
      history: [],
      precision: "simple",
    }, fetcher)).rejects.toMatchObject({
      name: "AdaptiveRouteError",
      code: "history_budget_exhausted",
      status: 409,
      retryable: false,
    });
  });
});
