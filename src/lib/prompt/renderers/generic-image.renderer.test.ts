import { describe, expect, it } from "vitest";
import "../init"; // registers adapters
import { renderPrompt } from "../adapters";
import { resolveWorkType } from "../registry";
import { renderGenericImage } from "./generic-image.renderer";
import { imagePromptAgentWorkType } from "../work-types/image-prompt-agent.worktype";
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

  it("P2-10: scoped dims follow hair before outfit before pose in subject phrase", () => {
    const brief = makeBrief([personSubjectItem, poseItem, outfitItem, hairItem]);
    const rendered = renderGenericImage(brief);
    const hairIdx = rendered.zhPrompt.indexOf("整洁短发");
    const outfitIdx = rendered.zhPrompt.indexOf("休闲轻便服装");
    const poseIdx = rendered.zhPrompt.indexOf("站立全身姿势");
    expect(hairIdx).toBeLessThan(outfitIdx);
    expect(outfitIdx).toBeLessThan(poseIdx);
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

  it("keeps portrait details when the subject is free text", () => {
    const rendered = renderPrompt({
      workType: imagePromptAgentWorkType,
      rawIntent: "",
      selections: {
        outfit: ["image_outfit:casual_wear"],
        pose: ["image_pose:standing"],
      },
      freeTexts: { subject: "戴头盔的宇航员" },
    });

    expect(rendered.zhPrompt).toContain("戴头盔的宇航员");
    expect(rendered.zhPrompt).toContain("休闲");
    expect(rendered.zhPrompt).toContain("站立");
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

  it("preserves Subject, confirmed Free text, catalog selections, Background direction, and constraints", () => {
    const rendered = renderPrompt({
      workType: imagePromptAgentWorkType,
      rawIntent: "疲惫的私家侦探，黑色小说封面",
      selections: {
        subject: ["image_subject:novel_character"],
        lighting: ["image_lighting:neon_light"],
      },
      freeTexts: { scene: "雨夜霓虹巷，湿润地面反光" },
    });

    expect(rendered.zhPrompt.startsWith("疲惫的私家侦探，黑色小说封面")).toBe(true);
    expect(rendered.zhPrompt).toContain("雨夜霓虹巷，湿润地面反光");
    expect(rendered.zhPrompt).toContain("霓虹");
    expect(rendered.zhPrompt).toContain("避免多手指");
    expect(rendered.zhPrompt).toContain("避免未成年或青少年角色的性感化");
  });
});

describe("portrait E2E renderer samples", () => {
  it("realistic beautiful woman — identity + face + constraints fold into a portrait prompt", () => {
    const rendered = renderPrompt({
      workType: imagePromptAgentWorkType,
      rawIntent: "海边回眸的漂亮女生，胶片感",
      selections: {
        subject: ["image_subject:beautiful_woman"],
        person_type: ["image_person_type:realistic_beauty"],
        gender_presentation: ["image_gender_presentation:feminine"],
        portrait_expression: ["image_portrait_expression:tender"],
        framing: ["image_framing:medium_shot"],
        lighting: ["image_lighting:golden_hour"],
      },
    });
    expect(rendered.zhPrompt).toContain("海边回眸的漂亮女生，胶片感");
    expect(rendered.zhPrompt).toContain("漂亮女性人物主体");
    expect(rendered.zhPrompt).toContain("真实系俊男美女人像");
    expect(rendered.zhPrompt).toContain("避免过度磨皮");
    expect(rendered.zhPrompt).toContain("避免多手指");
  });

  it("otome POV — interaction + render style read as immersive character CG", () => {
    const rendered = renderPrompt({
      workType: imagePromptAgentWorkType,
      rawIntent: "乙游男主心动对视",
      selections: {
        subject: ["image_subject:otome_character"],
        person_type: ["image_person_type:otome_visual_novel"],
        character_render_style: ["image_character_render_style:otome_cg"],
        character_interaction: ["image_character_interaction:holding_hands_pov"],
        portrait_expression: ["image_portrait_expression:intense"],
        art_style: ["image_art_style:anime_manga"],
      },
    });
    expect(rendered.zhPrompt).toContain("乙游男主心动对视");
    expect(rendered.zhPrompt).toContain("乙游");
    expect(rendered.zhPrompt).toContain("第一视角牵手");
    expect(rendered.zhPrompt).toContain("乙游剧情 CG");
  });

  it("game character splash — render style + archetype produce立绘-oriented prompt", () => {
    const rendered = renderPrompt({
      workType: imagePromptAgentWorkType,
      rawIntent: "银发剑士游戏立绘",
      selections: {
        subject: ["image_subject:game_character"],
        person_type: ["image_person_type:game_character"],
        character_render_style: ["image_character_render_style:gacha_splash_art"],
        character_archetype: ["image_character_archetype:warrior_guardian"],
        character_props: ["image_character_props:sword"],
        pose: ["image_pose:standing"],
        framing: ["image_framing:wide_shot"],
      },
    });
    expect(rendered.zhPrompt).toContain("银发剑士游戏立绘");
    expect(rendered.zhPrompt).toContain("游戏角色");
    expect(rendered.zhPrompt).toContain("卡面");
    expect(rendered.zhPrompt).toContain("战士");
    expect(rendered.zhPrompt).toMatch(/剑|姿态|stance/i);
  });
});
