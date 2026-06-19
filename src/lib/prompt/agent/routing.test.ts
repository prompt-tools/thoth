import { describe, it, expect } from "vitest";
import { routePrimaryType, suggestedIdsFromDescription, inferSubjectOptionIds } from "./routing";

describe("routePrimaryType portrait-only routing", () => {
  it("routes portrait signals to 人像", () => {
    expect(routePrimaryType("一个女生在海边")).toBe("人像");
    expect(routePrimaryType("portrait of a woman")).toBe("人像");
  });

  it("routes product, scene, animal, and food descriptions to 人像", () => {
    expect(routePrimaryType("白色耳机产品图")).toBe("人像");
    expect(routePrimaryType("星空下的山脉")).toBe("人像");
    expect(routePrimaryType("一只橘猫在沙发上")).toBe("人像");
    expect(routePrimaryType("精致的寿司摆盘")).toBe("人像");
  });

  it("routes empty and gibberish descriptions to 人像", () => {
    expect(routePrimaryType("")).toBe("人像");
    expect(routePrimaryType("xyzabc123")).toBe("人像");
  });
});

describe("suggestedIdsFromDescription", () => {
  it("suggests portrait subject types from description signals", () => {
    expect(suggestedIdsFromDescription("乙游男主牵手 POV", "人像")).toEqual(
      new Set(["image_subject:otome_character"])
    );
    expect(suggestedIdsFromDescription("漂亮女生头像", "人像")).toEqual(
      new Set(["image_subject:beautiful_woman"])
    );
    expect(suggestedIdsFromDescription("gacha game character splash art", "人像")).toEqual(
      new Set(["image_subject:game_character"])
    );
  });

  it("suggests game_character from warrior and mecha cues without explicit 游戏", () => {
    expect(suggestedIdsFromDescription("银发剑士", "人像")).toEqual(
      new Set(["image_subject:game_character"])
    );
    expect(suggestedIdsFromDescription("机甲少女战斗立绘", "人像")).toEqual(
      new Set(["image_subject:game_character"])
    );
  });

  it("suggests character_design from sheet and turnaround cues", () => {
    expect(suggestedIdsFromDescription("原创角色设定三视图", "人像")).toEqual(
      new Set(["image_subject:character_design"])
    );
  });

  it("does not suggest non-portrait subjects", () => {
    expect(suggestedIdsFromDescription("一只橘猫", "人像")).toEqual(new Set());
    expect(suggestedIdsFromDescription("白底耳机产品图", "人像")).toEqual(new Set());
  });
});

describe("inferSubjectOptionIds", () => {
  it("uses description signals then single_person fallback", () => {
    expect(inferSubjectOptionIds("游戏角色立绘，银发剑士", "人像")).toEqual([
      "image_subject:game_character",
    ]);
    expect(inferSubjectOptionIds("xyz no signals", "人像")).toEqual([
      "image_subject:single_person",
    ]);
    expect(inferSubjectOptionIds("", "人像")).toEqual([]);
  });
});
