import { describe, it, expect } from "vitest";
import "./init";
import { renderPrompt } from "./adapters";
import { getAllAdapters, getAllTargets, resolveWorkType } from "./registry";
import type { PromptBrief, RenderedPrompt, TargetToolId } from "./types";

function assertBriefShape(brief: PromptBrief, targetId: TargetToolId): void {
  expect(brief.version).toBeTypeOf("string");
  expect(brief.targetToolId).toBe(targetId);
  expect(brief.workTypeId).toBe("image_prompt");
  expect(Array.isArray(brief.items)).toBe(true);

  for (const item of brief.items) {
    expect(item.questionId).toBeTypeOf("string");
    expect(item.title.zh).toBeTypeOf("string");
    expect(item.title.en).toBeTypeOf("string");
    const hasFreeText = typeof item.freeText === "string" && item.freeText.length > 0;
    const hasSelections = Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0;
    expect(hasFreeText || hasSelections).toBe(true);
  }
}

function assertRenderedPrompt(rendered: RenderedPrompt, targetId: TargetToolId): void {
  expect(rendered.version).toBeTypeOf("string");
  expect(rendered.targetToolId).toBe(targetId);
  expect(rendered.zhPrompt.length).toBeGreaterThan(0);
  expect(rendered.enPrompt.length).toBeGreaterThan(0);
  expect(rendered.adaptationNote.zh).toBeTypeOf("string");
  expect(rendered.adaptationNote.en).toBeTypeOf("string");
  expect(Array.isArray(rendered.warnings)).toBe(true);
  assertBriefShape(rendered.brief, targetId);
}

describe("RenderedPrompt schema (N-08, image-only)", () => {
  const adapterIds = getAllAdapters().map((a) => a.target.id);

  describe("registration tripwires", () => {
    it("generic_image is the only registered target+adapter", () => {
      expect(adapterIds).toEqual(["generic_image"]);
      expect(getAllTargets().map((t) => t.id)).toEqual(["generic_image"]);
    });
  });

  it("generic_image: rendered prompt matches schema", () => {
    const workType = resolveWorkType("image_prompt");
    const rendered = renderPrompt({
      workType,
      rawIntent: "",
      selections: {},
    });
    assertRenderedPrompt(rendered, "generic_image");
  });
});
