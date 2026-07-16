import { describe, expect, it } from "vitest";
import {
  buildAdaptiveTurnSnapshot,
  normalizeAdaptiveResponse,
} from "./adaptive-turn";

function completionResponse() {
  return {
    choices: [{
      finish_reason: "tool_calls",
      message: {
        tool_calls: [{
          function: {
            name: "decide_adaptive_turn",
            arguments: JSON.stringify({
              done: true,
              nextQuestionId: null,
              questionText: null,
              helperText: null,
              optionIds: [],
            }),
          },
        }],
      },
    }],
  };
}

function malformedCompletionResponse() {
  const response = completionResponse();
  response.choices[0].message.tool_calls[0].function.arguments = JSON.stringify({
    done: true,
    nextQuestionId: null,
    questionText: "完成",
    helperText: null,
    optionIds: [],
  });
  return response;
}

describe("Adaptive multi-turn snapshot", () => {
  it("does not treat undecided bare dimension names as exact material facts", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "女战士，背景和服装还没想好，表情、光线、色调、氛围都请帮我决定，做电影海报",
      history: [],
      precision: "simple",
    });
    const facts = new Map(snapshot.knownFacts.map((fact) => [fact.dimension, fact]));

    for (const dimension of ["scene", "outfit", "portrait_expression", "lighting", "color_palette", "mood"]) {
      expect(facts.get(dimension)?.materiallyDifferentiating ?? false).toBe(false);
      expect(snapshot.eligibleDimensions.map((item) => item.questionId)).toContain(dimension);
    }
    expect(snapshot.completionEligible).toBe(false);
  });

  it("does not count an unknown Free-text answer as material coverage", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "原创游侠角色",
      history: [{ questionId: "scene", selectedOptionIds: [], freeText: "不知道，请帮我决定" }],
      precision: "simple",
    });
    const fact = snapshot.knownFacts.find((item) => item.source === "history" && item.dimension === "scene");

    expect(fact?.materiallyDifferentiating).toBe(false);
    expect(snapshot.coveredPillars).not.toContain("visualWorld");
    expect(snapshot.completionEligible).toBe(false);
  });

  it.each([
    "随便，都可以",
    "无所谓",
    "不限",
    "默认",
    "看着办",
    "可能，不一定",
  ])("does not count low-information history text as material coverage: %s", (freeText) => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "原创游侠角色",
      history: [{ questionId: "scene", selectedOptionIds: [], freeText }],
      precision: "simple",
    });
    const fact = snapshot.knownFacts.find((item) => item.source === "history" && item.dimension === "scene");

    expect(fact?.materiallyDifferentiating).toBe(false);
    expect(snapshot.coveredPillars).not.toContain("visualWorld");
  });

  it("keeps an explicitly undecided outfit eligible and blocks Completion", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "女船长怒视镜头，站在暴风雨甲板，电影海报，穿什么都可以",
      history: [],
      precision: "simple",
    });

    expect(snapshot.knownFacts.find((fact) => fact.dimension === "outfit")).toBeUndefined();
    expect(snapshot.eligibleDimensions.map((dimension) => dimension.questionId)).toContain("outfit");
    expect(snapshot.completionEligible).toBe(false);
  });

  it("does not allow four-pillar coverage to bypass an explicitly unresolved background", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "女船长怒视镜头，低机位，背景还没想好，电影海报",
      history: [],
      precision: "simple",
    });

    expect(snapshot.coveredPillars).toEqual([
      "characterSignature", "narrativeBehavior", "visualWorld", "presentationPurpose",
    ]);
    expect(snapshot.eligibleDimensions.map((dimension) => dimension.questionId)).toContain("scene");
    expect(snapshot.completionEligible).toBe(false);
    expect(normalizeAdaptiveResponse(completionResponse(), snapshot).diagnostics)
      .toMatchObject({ source: "fallback", reason: "premature_completion" });
  });

  it("clears an unresolved blocker after the user gives that dimension a concrete answer", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "女船长怒视镜头，低机位，背景还没想好，电影海报",
      history: [{ questionId: "scene", selectedOptionIds: ["image_scene:neon_cityscape"] }],
      precision: "simple",
    });

    expect(snapshot.eligibleDimensions.map((dimension) => dimension.questionId)).not.toContain("scene");
    expect(snapshot.coveredPillars).toHaveLength(4);
    expect(snapshot.completionEligible).toBe(true);
    expect(normalizeAdaptiveResponse(completionResponse(), snapshot).diagnostics)
      .toMatchObject({ source: "model" });
  });

  it("uses exact Brief catalog facts to remove cross-dimension conflicts", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "少年游侠角色，体型还没想好",
      history: [],
      precision: "simple",
    });
    const body = snapshot.eligibleDimensions.find((dimension) => dimension.questionId === "body_type");

    expect(body).toBeDefined();
    expect(body?.candidates.map((option) => option.id)).not.toContain("image_body_type:curvy");
  });

  it.each([
    ["银发女骑士角色设定表，正侧背三视图，白底", ["camera_angle", "pose", "scene"]],
    ["疲惫的私家侦探，黑色小说封面", ["mood", "use_case"]],
    ["动画主视觉：英雄们冲过暴风雪，强烈速度感", ["scene", "pose", "use_case"]],
    ["月光下的精灵弓手站在魔法森林里", ["lighting", "scene"]],
    ["时尚男模社交媒体头像，近距离裁切，极简高级", ["scene", "framing", "use_case"]],
  ])("suppresses fixture Known facts and deterministic irrelevancies for %s", (subjectBrief, suppressed) => {
    const snapshot = buildAdaptiveTurnSnapshot({ subjectBrief, history: [], precision: "simple" });
    const eligible = snapshot.eligibleDimensions.map((dimension) => dimension.questionId);
    expect(eligible).not.toEqual(expect.arrayContaining(suppressed));
  });

  it("derives a sparse 10-turn budget and suppresses an explicit background", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "用于求职简历的职业头像，白色背景，正式可信",
      history: [],
      precision: "detailed",
    });

    expect(snapshot.budget).toEqual({ class: "sparse", limit: 10, used: 0, remaining: 10 });
    expect(snapshot.knownFacts.map((fact) => fact.dimension)).toEqual(expect.arrayContaining([
      "subject", "use_case", "scene", "mood",
    ]));
    expect(snapshot.eligibleDimensions.map((dimension) => dimension.questionId)).not.toContain("scene");
  });

  it("derives a detailed 4-turn budget and suppresses explicit scene, light, pose, and style facts", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "二次元女学生坐在教室窗边，午后阳光，看向窗外",
      history: [],
      precision: "simple",
    });

    expect(snapshot.budget).toEqual({ class: "detailed", limit: 4, used: 0, remaining: 4 });
    expect(snapshot.eligibleDimensions.map((dimension) => dimension.questionId)).not.toEqual(expect.arrayContaining([
      "scene", "lighting", "pose", "character_interaction", "art_style",
    ]));
  });

  it("keeps a broad hair-color fact eligible for a narrower hairstyle question", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "银发剑士手游卡面，手持长剑",
      history: [],
      precision: "simple",
    });

    expect(snapshot.budget.class).toBe("partial");
    expect(snapshot.knownFacts).toContainEqual(expect.objectContaining({
      dimension: "hair",
      specificity: "broad",
    }));
    expect(snapshot.eligibleDimensions.map((dimension) => dimension.questionId)).toContain("hair");
  });

  it("recognizes a fully specified brief as a legal zero-turn remainingEmpty Completion", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "32岁、古铜色自然皮肤、高挑强健、红色长卷发、左眼眼罩和下颌疤痕、无妆感的女船长，穿黑色皮革长外套与金属肩甲，握弯刀怒视镜头，双腿站稳在暴风雨甲板上，低机位 35mm 全身竖版 2:3 海报构图，蓝绿色冷色调电影光效与雨雾，史诗紧张氛围，电影级高细节写实 3D 手游主视觉",
      history: [],
      precision: "simple",
    });

    expect(snapshot.budget.class).toBe("detailed");
    expect(snapshot.coveredPillars).toEqual([
      "characterSignature", "narrativeBehavior", "visualWorld", "presentationPurpose",
    ]);
    expect(snapshot.eligibleDimensions).toEqual([]);
    expect(snapshot.completionEligible).toBe(true);
    expect(normalizeAdaptiveResponse(completionResponse(), snapshot).decision.done).toBe(true);
  });

  it("rejects a premature Completion and falls back to a real Eligible Ask", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    });
    const result = normalizeAdaptiveResponse(completionResponse(), snapshot);

    expect(result.diagnostics).toMatchObject({ source: "fallback", reason: "premature_completion" });
    expect(result.decision.done).toBe(false);
    expect(result.decision.nextQuestionId).not.toBe("subject");
  });

  it("rejects a malformed Completion atomically", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "二次元女学生坐在教室窗边，午后阳光，看向窗外",
      history: [],
      precision: "simple",
    });

    expect(snapshot.completionEligible).toBe(true);
    expect(normalizeAdaptiveResponse(malformedCompletionResponse(), snapshot).diagnostics)
      .toMatchObject({ source: "fallback", reason: "completion_shape" });
  });

  it("allows exactly one final Ask at the sparse and detailed budget boundaries", () => {
    const sparse = buildAdaptiveTurnSnapshot({
      subjectBrief: "原创游侠角色",
      precision: "simple",
      history: [
        { questionId: "person_type", selectedOptionIds: ["image_person_type:game_character"] },
        { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:feminine"] },
        { questionId: "age_band", selectedOptionIds: ["image_age_band:young_adult"] },
        { questionId: "hair", selectedOptionIds: ["image_hair:ponytail"] },
        { questionId: "outfit", selectedOptionIds: [], freeText: "墨绿色游侠斗篷配银色肩甲" },
        { questionId: "character_props", selectedOptionIds: ["image_character_props:sword"] },
        { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:intense"] },
        { questionId: "pose", selectedOptionIds: ["image_pose:looking_back"] },
        { questionId: "art_style", selectedOptionIds: ["image_art_style:digital_painting"] },
      ],
    });
    const detailed = buildAdaptiveTurnSnapshot({
      subjectBrief: "红发女特工从雨夜霓虹巷中奔向镜头，紧张感电影海报",
      precision: "detailed",
      history: [
        { questionId: "hair", selectedOptionIds: ["image_hair:short_bob"] },
        { questionId: "outfit", selectedOptionIds: ["image_outfit:formal_suit"] },
        { questionId: "art_style", selectedOptionIds: ["image_art_style:photorealistic"] },
      ],
    });

    expect(sparse.budget).toMatchObject({ class: "sparse", limit: 10, used: 9, remaining: 1 });
    expect(sparse.eligibleDimensions.map((dimension) => dimension.questionId)).toEqual(expect.arrayContaining(["scene", "lighting"]));
    expect(detailed.budget).toMatchObject({ class: "detailed", limit: 4, used: 3, remaining: 1 });
    expect(detailed.eligibleDimensions.map((dimension) => dimension.questionId)).not.toEqual(expect.arrayContaining([
      "hair", "outfit", "pose", "scene", "use_case", "art_style", "mood",
    ]));
  });

  it("accepts legal Completion exactly at the partial seven-turn limit", () => {
    const snapshot = buildAdaptiveTurnSnapshot({
      subjectBrief: "32岁、利落齐耳短发、自然皮肤质感、无妆感的职业女性品牌头像，干练亲和；1:1 方形，平视 85mm 浅景深居中构图，冷灰蓝低饱和，高精细真人质感",
      precision: "simple",
      history: [
        { questionId: "face_features", selectedOptionIds: ["image_face_features:defined_jawline", "image_face_features:bright_clear_eyes"] },
        { questionId: "outfit", selectedOptionIds: ["image_outfit:formal_suit"] },
        { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:confident"] },
        { questionId: "framing", selectedOptionIds: ["image_framing:close_up"] },
        { questionId: "lighting", selectedOptionIds: ["image_lighting:butterfly"] },
        { questionId: "scene", selectedOptionIds: ["image_scene:gradient_bg"] },
        { questionId: "art_style", selectedOptionIds: ["image_art_style:portrait_photography"] },
      ],
    });

    expect(snapshot.budget).toMatchObject({ class: "partial", limit: 7, used: 7, remaining: 0 });
    expect(snapshot.coveredPillars).toHaveLength(4);
    expect(snapshot.eligibleDimensions).toEqual([]);
    expect(snapshot.completionEligible).toBe(true);
  });
});
