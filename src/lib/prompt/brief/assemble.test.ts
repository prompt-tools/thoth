import { describe, it, expect } from "vitest";
import "../init";
import { assemblePrompt } from "./assemble";
import type { BriefItem, PromptBrief } from "../types";

function multiSelectItem(): BriefItem {
  return {
    questionId: "style",
    title: { zh: "风格", en: "Style" },
    selectedOptions: [
      {
        id: "a",
        version: "0.1.0",
        label: { zh: "A", en: "A" },
        plain: { zh: "", en: "" },
        professionalTerms: [],
        promptFragment: { zh: "极简", en: "minimal" },
        appliesTo: ["generic_image"],
      },
      {
        id: "b",
        version: "0.1.0",
        label: { zh: "B", en: "B" },
        plain: { zh: "", en: "" },
        professionalTerms: [],
        promptFragment: { zh: "写实", en: "photorealistic" },
        appliesTo: ["generic_image"],
      },
    ],
  };
}

function briefWith(item: BriefItem): PromptBrief {
  return {
    version: "0.1.0",
    workTypeId: "image_prompt",
    targetToolId: "generic_image",
    rawIntent: "",
    items: [item],
  };
}

describe("assemblePrompt", () => {
  const templateMap = {
    style: { zh: "风格：{选项}", en: "Style: {选项}" },
  };

  it("joins multi-select fragments with Chinese comma for zh locale", () => {
    const parts = assemblePrompt(briefWith(multiSelectItem()), templateMap, "zh");
    expect(parts.style).toBe("风格：极简，写实");
  });

  it("joins multi-select fragments with ASCII comma for en locale (F-L1)", () => {
    const parts = assemblePrompt(briefWith(multiSelectItem()), templateMap, "en");
    expect(parts.style).toBe("Style: minimal, photorealistic");
    expect(parts.style).not.toContain("，");
  });
});
