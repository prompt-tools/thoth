import { describe, it, expect } from "vitest";
import "./init";
import { renderPrompt } from "./adapters";
import { resolveWorkType, resolveTarget } from "./registry";
import type { NegativePromptTier } from "./types";

/**
 * N-06 — Coverage for negPromptTier surfacing (image-only fork).
 */

const TIERS: NegativePromptTier[] = ["light", "medium", "heavy"];

describe("negPromptTier surfacing (N-06)", () => {
  describe("generic_image (target with negativePrompt config)", () => {
    const workType = resolveWorkType("image_prompt");
    const target = resolveTarget("generic_image");
    const baseSelections = {};

    describe("config tripwires", () => {
      it("target.negativePrompt declares all three tiers with non-empty zh + en text", () => {
        expect(target.negativePrompt).toBeDefined();
        const texts = target.negativePrompt?.texts;
        expect(texts).toBeDefined();
        for (const tier of TIERS) {
          expect(texts?.[tier].zh.length).toBeGreaterThan(0);
          expect(texts?.[tier].en.length).toBeGreaterThan(0);
        }
      });
    });

    it.each(TIERS)(
      "tier %s — rendered output contains the tier-specific negative prompt text",
      (tier) => {
        const rendered = renderPrompt({
          workType,
          rawIntent: "",
          selections: baseSelections,
          negPromptTier: tier,
        });

        const expectedZh = target.negativePrompt?.texts[tier].zh ?? "";
        const expectedEn = target.negativePrompt?.texts[tier].en ?? "";
        expect(rendered.zhPrompt).toContain(expectedZh);
        expect(rendered.enPrompt).toContain(expectedEn);
      },
    );

    it("the three tiers produce three distinct rendered outputs", () => {
      const outputs = TIERS.map((tier) =>
        renderPrompt({
          workType,
          rawIntent: "",
          selections: baseSelections,
          negPromptTier: tier,
        }),
      );

      const zhSet = new Set(outputs.map((r) => r.zhPrompt));
      const enSet = new Set(outputs.map((r) => r.enPrompt));
      expect(zhSet.size).toBe(3);
      expect(enSet.size).toBe(3);
    });

    it("heavy tier output is a superset of light tier (avoidance list grows monotonically)", () => {
      const splitItems = (s: string) =>
        s
          .split(/[,，:：]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      const lightItems = splitItems(target.negativePrompt?.texts.light.zh ?? "");
      const heavyText = target.negativePrompt?.texts.heavy.zh ?? "";
      for (const item of lightItems) {
        expect(heavyText).toContain(item);
      }
    });

    it("falls back to default tier when negPromptTier is omitted", () => {
      const omitted = renderPrompt({
        workType,
        rawIntent: "",
        selections: baseSelections,
      });
      const defaultTier = target.negativePrompt?.default ?? "medium";
      const defaultText = target.negativePrompt?.texts[defaultTier].zh ?? "";
      expect(omitted.zhPrompt).toContain(defaultText);
    });
  });
});
