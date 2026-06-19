import { describe, it, expect } from "vitest";
import {
  applyPortraitFillPolicy,
  boostedQuestionIds,
} from "./fill-boost";

describe("applyPortraitFillPolicy", () => {
  const base = [
    "scene",
    "aspect_ratio",
    "age_band",
    "face_features",
    "hair",
    "outfit",
    "pose",
    "lighting",
  ];

  it("front-loads lighting, hair, pose before scene/age_band without seed", () => {
    const result = applyPortraitFillPolicy(base, "普通女生写真");
    expect(result.indexOf("lighting")).toBeLessThan(result.indexOf("scene"));
    expect(result.indexOf("hair")).toBeLessThan(result.indexOf("age_band"));
    expect(result.indexOf("pose")).toBeLessThan(result.indexOf("aspect_ratio"));
  });

  it("drops outfit when pose wins by default (no outfit/pose seed)", () => {
    const result = applyPortraitFillPolicy(base, "普通描述");
    expect(result).toContain("pose");
    expect(result).not.toContain("outfit");
  });

  it("keeps outfit and drops pose when seed mentions 婚纱", () => {
    const result = applyPortraitFillPolicy(base, "穿婚纱的新娘");
    expect(result).toContain("outfit");
    expect(result).not.toContain("pose");
  });

  it("keeps pose and drops outfit when seed mentions 回眸", () => {
    const result = applyPortraitFillPolicy(base, "回眸站立的少女");
    expect(result).toContain("pose");
    expect(result).not.toContain("outfit");
  });

  it("demotes age_band to the tail without age signals", () => {
    const result = applyPortraitFillPolicy(base, "普通描述");
    expect(result[result.length - 1]).toBe("age_band");
  });

  it("does not demote age_band when seed mentions 青年", () => {
    const result = applyPortraitFillPolicy(base, "青年男性");
    expect(result.indexOf("age_band")).toBeLessThan(result.length - 1);
  });
});

describe("boostFillCandidates", () => {
  it("still boosts seed-matched dims ahead of portrait core reorder", () => {
    const boosted = boostedQuestionIds("银发");
    expect(boosted.has("hair")).toBe(true);
    const ordered = applyPortraitFillPolicy(["scene", "hair", "lighting"], "银发");
    expect(ordered[0]).toBe("hair");
  });
});
