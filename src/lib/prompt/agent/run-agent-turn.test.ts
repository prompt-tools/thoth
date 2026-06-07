import { describe, it, expect } from "vitest";
import "../init";
import { buildTurnRequest, parseTurnResponse, runAgentTurn } from "./client";
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
    const { ordered } = activeDimensions("通用", "simple", []);
    expect(ctx.currentQuestionId).toBe(ordered[0]);
    expect(ctx.remainingEmpty).toBe(false);
    expect(ctx.type).toBe("通用");
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
    const { ordered } = activeDimensions("通用", "simple", []);
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

  // ⑥ P0-A: subject pre-filter — model only receives category-matched options
  it("⑥ 动物 subject turn: options JSON contains only pet_animal + wildlife", async () => {
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
      return makeResp(["image_subject:pet_animal"]);
    };

    await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "橘色小猫" },
      transport
    );

    expect(capturedOptions).toContain("image_subject:pet_animal");
    expect(capturedOptions).toContain("image_subject:wildlife");
    expect(capturedOptions).not.toContain("image_subject:food_beverage");
    expect(capturedOptions).not.toContain("image_subject:single_person");
    expect(capturedOptions.length).toBe(2); // only the 2 animal options
  });

  // ⑦ P0-A fallback: invalid options → falls back to filtered set, not full catalog
  it("⑦ 动物 subject fallback uses filtered options, not full catalog", async () => {
    const { decision } = await runAgentTurn(
      provider, "test-key",
      { manifest, history: [], userDescription: "橘色小猫" },
      async () => makeResp(["image_fake:nonexistent"])
    );

    expect(decision.visibleOptionIds).toContain("image_subject:pet_animal");
    expect(decision.visibleOptionIds).toContain("image_subject:wildlife");
    expect(decision.visibleOptionIds).not.toContain("image_subject:food_beverage");
    expect(decision.visibleOptionIds).not.toContain("image_subject:single_person");
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
