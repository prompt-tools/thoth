import { describe, expect, it } from "vitest";
import "../init"; // registers adapters
import { renderPrompt } from "../adapters";
import { resolveWorkType } from "../registry";
import { renderGenericImage } from "./generic-image.renderer";
import type { LocalizedText, OptionItem, PromptBrief } from "../types";

function makeOption(id: string, label: LocalizedText, fragment: LocalizedText): OptionItem {
  return {
    id,
    version: "0.1.0",
    label,
    plain: fragment,
    professionalTerms: [],
    promptFragment: fragment,
    appliesTo: ["generic_image"],
  };
}

function makeBrief(items: PromptBrief["items"]): PromptBrief {
  return {
    version: "0.1.0",
    workTypeId: "image_prompt",
    targetToolId: "generic_image",
    rawIntent: "",
    items,
  };
}

describe("P6 portrait renderer coupling: pose/outfit/hair fold into subject phrase", () => {
  const personSubjectItem = {
    questionId: "subject",
    title: { zh: "主体", en: "Subject" },
    selectedOptions: [
      makeOption(
        "image_subject:single_person",
        { zh: "单人", en: "Single person" },
        { zh: "单个主体人物", en: "a single person" }
      ),
    ],
  };
  const poseItem = {
    questionId: "pose",
    title: { zh: "姿势", en: "Pose" },
    selectedOptions: [
      makeOption(
        "image_pose:standing",
        { zh: "站立", en: "Standing" },
        { zh: "站立全身姿势", en: "standing full-body pose" }
      ),
    ],
  };
  const outfitItem = {
    questionId: "outfit",
    title: { zh: "服装", en: "Outfit" },
    selectedOptions: [
      makeOption(
        "image_outfit:casual",
        { zh: "休闲", en: "Casual" },
        { zh: "休闲轻便服装", en: "casual everyday outfit" }
      ),
    ],
  };
  const hairItem = {
    questionId: "hair",
    title: { zh: "发型", en: "Hair" },
    selectedOptions: [
      makeOption(
        "image_hair:short",
        { zh: "短发", en: "Short hair" },
        { zh: "整洁短发", en: "neat short hair" }
      ),
    ],
  };

  it("portrait dims (pose + outfit + hair) are assembled into the leading subject phrase", () => {
    const brief = makeBrief([personSubjectItem, poseItem, outfitItem, hairItem]);
    const rendered = renderGenericImage(brief);
    expect(rendered.zhPrompt).toContain("站立全身姿势");
    expect(rendered.zhPrompt).toContain("休闲轻便服装");
    expect(rendered.zhPrompt).toContain("整洁短发");
    const negIdx = rendered.zhPrompt.indexOf("避免");
    expect(rendered.zhPrompt.indexOf("站立全身姿势")).toBeLessThan(negIdx);
    for (const frag of ["站立全身姿势", "休闲轻便服装", "整洁短发"]) {
      expect(rendered.zhPrompt.indexOf(frag)).toBe(rendered.zhPrompt.lastIndexOf(frag));
    }
  });

  it("portrait dims do NOT appear for a subject id outside portrait scope", () => {
    const outsideScopeSubjectItem = {
      questionId: "subject",
      title: { zh: "主体", en: "Subject" },
      selectedOptions: [
        makeOption(
          "image_subject:object_subject",
          { zh: "物体", en: "Object" },
          { zh: "一个非人像主体", en: "a non-portrait subject" }
        ),
      ],
    };
    const rendered = renderGenericImage(makeBrief([outsideScopeSubjectItem, poseItem, outfitItem, hairItem]));
    expect(rendered.zhPrompt).not.toContain("站立全身姿势");
    expect(rendered.zhPrompt).not.toContain("休闲轻便服装");
    expect(rendered.zhPrompt).not.toContain("整洁短发");
  });
});

describe("generic-image renderer snapshot", () => {
  it("emits non-empty zh and en prompts (comma-separated keywords)", () => {
    const workType = resolveWorkType("image_prompt");
    const rendered = renderPrompt({
      workType,
      rawIntent: "",
      selections: {
        use_case: ["image_use_case:social_media_post"],
        subject: ["image_subject:single_person"],
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
