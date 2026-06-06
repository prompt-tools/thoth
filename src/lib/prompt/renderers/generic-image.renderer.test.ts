import { describe, expect, it } from "vitest";
import "../init"; // registers adapters
import { renderPrompt } from "../adapters";
import { resolveWorkType } from "../registry";

describe("generic-image renderer snapshot", () => {
  it("emits non-empty zh and en prompts (comma-separated keywords)", () => {
    const workType = resolveWorkType("image_prompt");
    const rendered = renderPrompt({
      workType,
      rawIntent: "",
      selections: {
        use_case: ["image_use_case:social_media_post"],
        subject: ["image_subject:hero_product"],
      },
    });
    expect(rendered.zhPrompt.length).toBeGreaterThan(0);
    expect(rendered.enPrompt.length).toBeGreaterThan(0);
    expect(rendered.zhPrompt).toContain("，"); // zh comma
    expect(rendered.enPrompt).toContain(","); // en comma
  });

  it("emits no byte-identical duplicate fragment across dimensions (dedupe)", () => {
    const workType = resolveWorkType("image_prompt");
    const rendered = renderPrompt({
      workType,
      rawIntent: "",
      selections: {
        subject: ["image_subject:single_person"],
        camera: ["image_camera:85mm_portrait", "image_camera:wide_aperture_bokeh"],
        framing: ["image_framing:close_up"],
        lighting: ["image_lighting:window_soft"],
      },
    });
    // exclude the trailing negative-prompt block (internally "、"-joined, no "，")
    const frags = rendered.zhPrompt.split("，").map((f) => f.trim()).filter(Boolean);
    expect(new Set(frags).size).toBe(frags.length); // every fragment unique
  });

  it("seed-anchors: rawIntent leads the prompt so it survives selection-only render", () => {
    const workType = resolveWorkType("image_prompt");
    const rendered = renderPrompt({
      workType,
      rawIntent: "实验室科学家，人物头像",
      selections: { subject: ["image_subject:single_person"] },
    });
    expect(rendered.zhPrompt.startsWith("实验室科学家，人物头像")).toBe(true);
  });
});
