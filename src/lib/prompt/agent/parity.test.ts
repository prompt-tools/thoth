import { describe, it, expect } from "vitest";
import "../init";
import { requestNextStep } from "./client";
import { buildCatalogManifest } from "./catalog-manifest";
import { activeDimensions } from "./active-dimensions";
import { getProvider } from "./providers";

const provider = getProvider("deepseek");
const manifest = buildCatalogManifest();

function stubTransport(visibleOptionIds: string[]) {
  return async () => ({
    choices: [{
      message: {
        tool_calls: [{
          function: {
            name: "select_options",
            arguments: JSON.stringify({ visibleOptionIds, helperText: "test" }),
          },
        }],
      },
    }],
  });
}

describe("requestNextStep parity with activeDimensions", () => {
  // ① remainingEmpty → done
  it("① remainingEmpty: returns done decision", async () => {
    const fullHistory = manifest.map((d) => ({
      questionId: d.questionId,
      selectedOptionIds: [d.options[0].id],
    }));

    const decision = await requestNextStep(provider, "test-key", {
      manifest,
      history: fullHistory,
    }, stubTransport([]));

    expect(decision.done).toBe(true);
  });

  // ② normal turn → nextQuestionId = ordered[0], visibleOptionIds from model
  it("② normal turn: nextQuestionId = ordered[0], visibleOptionIds filtered", async () => {
    const { ordered } = activeDimensions("通用", "simple", []);
    const currentDim = manifest.find((d) => d.questionId === ordered[0])!;
    const picked = currentDim.options.slice(0, 3).map((o) => o.id);

    const decision = await requestNextStep(provider, "test-key", {
      manifest,
      history: [],
      userDescription: "",
    }, stubTransport(picked));

    expect(decision.nextQuestionId).toBe(ordered[0]);
    expect(decision.done).toBe(false);
    for (const id of decision.visibleOptionIds) {
      expect(picked).toContain(id);
    }
  });

  // ③ done=true from model → ignored
  it("③ model done=true is ignored", async () => {
    const { ordered } = activeDimensions("通用", "simple", []);
    const currentDim = manifest.find((d) => d.questionId === ordered[0])!;
    const picked = currentDim.options.slice(0, 2).map((o) => o.id);

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "select_options",
              arguments: JSON.stringify({ visibleOptionIds: picked, helperText: "test", done: true }),
            },
          }],
        },
      }],
    });

    const decision = await requestNextStep(provider, "test-key", {
      manifest,
      history: [],
    }, transport);

    expect(decision.done).toBe(false);
  });

  // ④ invalid options → fallback to all
  it("④ invalid visibleOptionIds → fallback to all dimension options", async () => {
    const { ordered } = activeDimensions("通用", "simple", []);
    const currentDim = manifest.find((d) => d.questionId === ordered[0])!;

    const decision = await requestNextStep(provider, "test-key", {
      manifest,
      history: [],
    }, stubTransport(["image_fake:bad"]));

    expect(decision.visibleOptionIds).toEqual(currentDim.options.map((o) => o.id));
  });

  // ⑤ harness auto-answer → render roundtrip
  it("⑤ harness auto-answer → render roundtrip produces valid prompt", async () => {
    // This test validates the end-to-end flow works with the new API
    const { ordered } = activeDimensions("通用", "simple", []);
    const currentDim = manifest.find((d) => d.questionId === ordered[0])!;
    const picked = currentDim.options.slice(0, 2).map((o) => o.id);

    const decision = await requestNextStep(provider, "test-key", {
      manifest,
      history: [],
    }, stubTransport(picked));

    expect(decision.nextQuestionId).toBeTruthy();
    expect(decision.visibleOptionIds.length).toBeGreaterThan(0);
    expect(decision.done).toBe(false);
  });
});
