import { describe, expect, it } from "vitest";
import {
  analyzePortraitPrompts,
  detectPortraitSections,
  isPortraitPrompt,
  tokenizePrompt,
} from "./portrait-prompt-analysis";

describe("portrait prompt analysis", () => {
  it("detects human and character prompts", () => {
    expect(isPortraitPrompt("beautiful woman portrait, soft light")).toBe(true);
    expect(isPortraitPrompt("乙游男主，牵手 POV，温柔眼神")).toBe(true);
    expect(isPortraitPrompt("white headphones product photo")).toBe(false);
  });

  it("classifies prompt structure sections", () => {
    const sections = detectPortraitSections(
      "anime character, silver hair, clear eyes, school uniform, looking at viewer, castle background, soft light, best quality"
    );
    expect(sections).toContain("subject");
    expect(sections).toContain("hair");
    expect(sections).toContain("face");
    expect(sections).toContain("outfit");
    expect(sections).toContain("interaction");
    expect(sections).toContain("scene");
    expect(sections).toContain("lighting");
    expect(sections).toContain("quality");
  });

  it("tokenizes prompts without common stop words", () => {
    expect(tokenizePrompt("portrait of a woman with soft light")).toEqual([
      "portrait",
      "woman",
      "soft",
      "light",
    ]);
  });

  it("summarizes portrait rows, sections, and top tokens", () => {
    const result = analyzePortraitPrompts([
      "beautiful woman portrait, clear eyes, soft light, best quality",
      "game character, armor outfit, battle ready pose, detailed illustration",
      "clean product photo of headphones",
    ]);

    expect(result.totalRows).toBe(3);
    expect(result.portraitRows).toBe(2);
    expect(result.sectionCounts.subject).toBe(2);
    expect(result.sectionCounts.face).toBe(1);
    expect(result.sectionCounts.outfit).toBe(1);
    expect(result.topTokens.map((item) => item.token)).toContain("character");
  });
});
