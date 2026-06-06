import { describe, it, expect } from "vitest";
import "../init";
import { buildPromptBrief } from "./build";
import { imagePromptAgentWorkType } from "../work-types/image-prompt-agent.worktype";
import { IMAGE_TARGET_ID } from "../types";
import { getOptionsForTarget } from "../registry";

const base = {
  workType: imagePromptAgentWorkType,
  targetToolId: IMAGE_TARGET_ID as typeof IMAGE_TARGET_ID,
  rawIntent: "",
} satisfies Omit<Parameters<typeof buildPromptBrief>[0], "selections" | "freeTexts">;

const firstSubjectId = getOptionsForTarget("image_subject", IMAGE_TARGET_ID)[0].id;

describe("buildPromptBrief — freeTexts override (Phase C-2 escape hatch)", () => {
  it("uses the option pick when no freeText override is given", () => {
    const brief = buildPromptBrief({ ...base, selections: { subject: firstSubjectId } });
    const item = brief.items.find((i) => i.questionId === "subject");
    expect(item?.freeText).toBeUndefined();
    expect(item?.selectedOptions.map((o) => o.id)).toEqual([firstSubjectId]);
  });

  it("freeText override replaces the option picks for that dimension", () => {
    const brief = buildPromptBrief({
      ...base,
      selections: { subject: firstSubjectId },
      freeTexts: { subject: "一台放在木桌上的 MacBook Pro" },
    });
    const item = brief.items.find((i) => i.questionId === "subject");
    expect(item?.freeText).toBe("一台放在木桌上的 MacBook Pro");
    expect(item?.selectedOptions).toEqual([]);
  });

  it("blank / whitespace override is ignored (falls back to options)", () => {
    const brief = buildPromptBrief({
      ...base,
      selections: { subject: firstSubjectId },
      freeTexts: { subject: "   " },
    });
    const item = brief.items.find((i) => i.questionId === "subject");
    expect(item?.freeText).toBeUndefined();
    expect(item?.selectedOptions.map((o) => o.id)).toEqual([firstSubjectId]);
  });

  it("freeText alone (no option selected) still produces a brief item", () => {
    const brief = buildPromptBrief({
      ...base,
      selections: {},
      freeTexts: { subject: "赛博朋克风格的机械猫" },
    });
    const item = brief.items.find((i) => i.questionId === "subject");
    expect(item?.freeText).toBe("赛博朋克风格的机械猫");
  });
});
