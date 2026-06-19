import { describe, it, expect } from "vitest";
import "../init";
import { activeDimensions } from "./active-dimensions";
import { GRADIENT } from "./gradient";
import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";

const manifest = buildCatalogManifest();

function firstOpt(qid: string): string {
  const dim = manifest.find((d) => d.questionId === qid)!;
  return dim.options[0].id;
}

describe("activeDimensions portrait-only flow", () => {
  it("each answered dimension is removed from the next ordered set", () => {
    for (const type of ["人像", "通用"]) {
      const history: AgentHistoryItem[] = [];
      for (let i = 0; i < 20; i++) {
        const { ordered, done } = activeDimensions(type, "simple", history);
        if (done) break;
        const nextQid = ordered[0];
        history.push({ questionId: nextQid, selectedOptionIds: [firstOpt(nextQid)] });
        const after = activeDimensions(type, "simple", history);
        expect(after.ordered).not.toContain(nextQid);
      }
    }
  });

  it("portrait close_up suppresses full-body or interaction dimensions", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:close_up"] },
    ];
    const { ordered } = activeDimensions("人像", "standard", history);
    expect(ordered).not.toContain("pose");
    expect(ordered).not.toContain("outfit");
    expect(ordered).not.toContain("body_type");
    expect(ordered).not.toContain("character_interaction");
  });

  it("portrait wide_shot keeps pose/outfit/body in standard flow", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:wide_shot"] },
    ];
    const { ordered } = activeDimensions("人像", "standard", history);
    expect(ordered).toContain("pose");
    expect(ordered).toContain("outfit");
    expect(ordered).toContain("body_type");
  });

  it("precision progression: simple subset of standard subset of detailed", () => {
    const simple = activeDimensions("人像", "simple", []).ordered;
    const standard = activeDimensions("人像", "standard", []).ordered;
    const detailed = activeDimensions("人像", "detailed", []).ordered;

    for (const qid of simple) expect(standard).toContain(qid);
    for (const qid of standard) expect(detailed).toContain(qid);
    expect(standard.length).toBeGreaterThanOrEqual(simple.length);
    expect(detailed.length).toBeGreaterThanOrEqual(standard.length);
  });

  it("done: returns true when all active simple dimensions are asked", () => {
    const history: AgentHistoryItem[] = [];
    for (let i = 0; i < 30; i++) {
      const { ordered, done } = activeDimensions("人像", "simple", history);
      if (done) {
        expect(ordered.length).toBe(0);
        break;
      }
      history.push({ questionId: ordered[0], selectedOptionIds: [firstOpt(ordered[0])] });
    }
    const finalResult = activeDimensions("人像", "simple", history);
    expect(finalResult.done).toBe(true);
  });

  it("simple tier asks only five portrait-core dimensions", () => {
    const afterSubject: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
    ];
    const { ordered } = activeDimensions("人像", "simple", afterSubject);
    expect(ordered).toEqual([
      "person_type",
      "gender_presentation",
      "framing",
      "portrait_expression",
    ]);
  });

  it("empty subject pick infers scope from description so essentials are not dropped", () => {
    const history: AgentHistoryItem[] = [{ questionId: "subject", selectedOptionIds: [] }];
    const { ordered } = activeDimensions("人像", "simple", history, GRADIENT, "游戏角色立绘，银发剑士");
    expect(ordered).toEqual([
      "person_type",
      "gender_presentation",
      "framing",
      "portrait_expression",
    ]);
  });

  it("aspect_ratio and scene enter at standard precision", () => {
    const simple = activeDimensions("人像", "simple", []).ordered;
    expect(simple).not.toContain("aspect_ratio");
    expect(simple).not.toContain("scene");
    const standard = activeDimensions("人像", "standard", []).ordered;
    expect(standard).toContain("aspect_ratio");
    expect(standard).toContain("scene");
  });

  it("standard tier asks hair/outfit/pose before art_style and mood when framing allows", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
    ];
    const { ordered } = activeDimensions("人像", "standard", history);
    const hairIdx = ordered.indexOf("hair");
    const outfitIdx = ordered.indexOf("outfit");
    const poseIdx = ordered.indexOf("pose");
    const moodIdx = ordered.indexOf("mood");
    const artIdx = ordered.indexOf("art_style");
    expect(hairIdx).toBeGreaterThan(-1);
    expect(outfitIdx).toBeGreaterThan(-1);
    expect(poseIdx).toBeGreaterThan(-1);
    expect(hairIdx).toBeLessThan(moodIdx);
    expect(outfitIdx).toBeLessThan(moodIdx);
    expect(poseIdx).toBeLessThan(moodIdx);
    expect(hairIdx).toBeLessThan(artIdx);
  });

  it("close_up keeps hair early but suppresses pose and outfit", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:close_up"] },
    ];
    const { ordered } = activeDimensions("人像", "standard", history);
    expect(ordered).toContain("hair");
    expect(ordered).not.toContain("pose");
    expect(ordered).not.toContain("outfit");
    const hairIdx = ordered.indexOf("hair");
    const artIdx = ordered.indexOf("art_style");
    expect(hairIdx).toBeLessThan(artIdx);
  });

  it("unknown type falls back to 通用 portrait flow", () => {
    const { ordered } = activeDimensions("不存在的类型", "simple", []);
    const generic = activeDimensions("通用", "simple", []);
    expect(ordered).toEqual(generic.ordered);
    expect(ordered).toContain("subject");
    expect(ordered).not.toContain("person_type");
  });

  it("hides subject-scoped dimensions until subject is answered", () => {
    const { ordered } = activeDimensions("人像", "simple", []);
    expect(ordered).toEqual(["subject", "framing"]);
  });

  it("filters fictional-only dimensions for real-person subjects", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
    ];
    const { ordered } = activeDimensions("人像", "detailed", history);
    expect(ordered).not.toContain("character_archetype");
    expect(ordered).not.toContain("character_props");
    expect(ordered).toContain("person_type");
  });

  it("P1 props: game_character gets props only when seed mentions a prop cue", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:game_character"] },
    ];
    expect(activeDimensions("人像", "detailed", history, GRADIENT, "游戏角色立绘").ordered).not.toContain(
      "character_props",
    );
    expect(activeDimensions("人像", "detailed", history, GRADIENT, "持剑战士立绘").ordered).toContain(
      "character_props",
    );
    expect(activeDimensions("人像", "detailed", history).ordered).toContain("character_archetype");
    expect(activeDimensions("人像", "detailed", history).ordered).not.toContain("character_interaction");
  });

  it("P1-6: character_interaction only for otome, couple, and group subjects", () => {
    const otome = activeDimensions("人像", "detailed", [
      { questionId: "subject", selectedOptionIds: ["image_subject:otome_character"] },
    ]).ordered;
    expect(otome).toContain("character_interaction");

    const couple = activeDimensions("人像", "detailed", [
      { questionId: "subject", selectedOptionIds: ["image_subject:couple_portrait"] },
    ]).ordered;
    expect(couple).toContain("character_interaction");

    const group = activeDimensions("人像", "detailed", [
      { questionId: "subject", selectedOptionIds: ["image_subject:group_portrait"] },
    ]).ordered;
    expect(group).toContain("character_interaction");

    const woman = activeDimensions("人像", "detailed", [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
    ]).ordered;
    expect(woman).not.toContain("character_interaction");
  });

  it("P1-7: detailed flow omits use_case and post_processing", () => {
    const { ordered } = activeDimensions("人像", "detailed", [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
    ]);
    expect(ordered).not.toContain("use_case");
    expect(ordered).not.toContain("post_processing");
    expect(ordered).toContain("detail_level");
    expect(ordered).toContain("composition");
  });

  it("P1-8: suppresses aspect_ratio and camera_angle after framing without camera seed", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
    ];
    const withoutSeed = activeDimensions("人像", "standard", history, GRADIENT, "普通女生写真").ordered;
    expect(withoutSeed).not.toContain("aspect_ratio");
    expect(withoutSeed).not.toContain("camera_angle");
    expect(withoutSeed).toContain("camera");

    const withSeed = activeDimensions("人像", "standard", history, GRADIENT, "85mm 虚化人像").ordered;
    expect(withSeed).toContain("aspect_ratio");
    expect(withSeed).toContain("camera_angle");
  });

  it("generic fallback mirrors portrait detailed dimensions", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:game_character"] },
    ];
    const portrait = activeDimensions("人像", "detailed", history).ordered;
    const generic = activeDimensions("通用", "detailed", history).ordered;
    expect(generic).toEqual(portrait);
  });
});
