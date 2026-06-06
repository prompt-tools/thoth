import { describe, expect, it } from "vitest";
import { evaluatePromptQuality } from "./heuristics";
import type { PromptSelections } from "./types";

const validImageSelections: PromptSelections = {
  use_case: "image_use_case:social_media_post",
  subject: "image_subject:single_person",
  scene: "image_scene:urban_street",
  composition: "image_composition:rule_of_thirds",
  lighting: "image_lighting:golden_hour",
  art_style: "image_art_style:photorealistic",
  color_palette: "image_color_palette:warm",
  constraints: ["image_constraints:no_ip_celebrity"],
};

describe("evaluatePromptQuality — image_prompt", () => {
  it("fires image rules when workTypeId is image_prompt", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      subject: "",
      lighting: "",
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("未指定主体");
    expect(zh).toContain("图片生成");
    expect(zh).not.toContain("视频提示词");
  });
});

describe("evaluatePromptQuality — image completeness rule", () => {
  it("warns when image subject is missing", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      subject: "",
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("未指定主体");
    expect(zh).toContain("图片生成最重要的维度");
    expect(zh).toContain("建议添加");
  });

  it("does not warn when image subject IS selected", () => {
    const warnings = evaluatePromptQuality(validImageSelections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).not.toContain("未指定主体");
  });
});

describe("evaluatePromptQuality — image conflict rules", () => {
  it("warns when photorealistic + anime_manga both selected", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      art_style: ["image_art_style:photorealistic", "image_art_style:anime_manga"],
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("写实");
    expect(zh).toContain("动漫");
    expect(zh).toContain("冲突");
  });

  it("warns when monochrome + vibrant color palette both selected", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      color_palette: ["image_color_palette:monochrome", "image_color_palette:vibrant"],
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("黑白");
    expect(zh).toContain("高饱和");
    expect(zh).toContain("互斥");
  });

  it("warns when watercolor + sharp focus styles both selected", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      art_style: ["image_art_style:watercolor", "image_art_style:photorealistic"],
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("水彩");
    expect(zh).toContain("锐焦");
  });

  it("warns when 3+ art mediums are selected", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      art_style: [
        "image_art_style:oil_painting",
        "image_art_style:watercolor",
        "image_art_style:pencil_sketch",
      ],
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("创作媒介");
  });

  it("warns when flat vector + volumetric lighting both selected", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      art_style: "image_art_style:vector_flat",
      lighting: "image_lighting:volumetric_god_rays",
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("扁平矢量");
    expect(zh).toContain("体积光");
  });

  it("warns when 3D render + hand-drawn styles both selected", () => {
    const selections: PromptSelections = {
      ...validImageSelections,
      art_style: ["image_art_style:3d_render", "image_art_style:pencil_sketch"],
    };
    const warnings = evaluatePromptQuality(selections, "", "image_prompt");
    const zh = warnings.map((w) => w.zh).join("");
    expect(zh).toContain("3D渲染");
    expect(zh).toContain("手绘");
  });

  it("produces no image warnings when all image rules conditions are absent", () => {
    const warnings = evaluatePromptQuality(validImageSelections, "", "image_prompt");
    expect(warnings).toEqual([]);
  });
});
