import { describe, it, expect } from "vitest";
import "../init";
import { activeDimensions } from "./active-dimensions";
import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";

const manifest = buildCatalogManifest();

function firstOpt(qid: string): string {
  const dim = manifest.find((d) => d.questionId === qid)!;
  return dim.options[0].id;
}

describe("activeDimensions portrait-only flow", () => {
  it("monotonicity: each answered dimension strictly reduces ordered count", () => {
    for (const type of ["人像", "通用"]) {
      const history: AgentHistoryItem[] = [];
      let prev = activeDimensions(type, "simple", history).ordered.length;

      for (let i = 0; i < 20; i++) {
        const { ordered } = activeDimensions(type, "simple", history);
        if (ordered.length === 0) break;
        const nextQid = ordered[0];
        history.push({ questionId: nextQid, selectedOptionIds: [firstOpt(nextQid)] });
        const curr = activeDimensions(type, "simple", history).ordered.length;
        expect(curr).toBeLessThan(prev);
        prev = curr;
      }
    }
  });

  it("portrait close_up suppresses full-body or interaction dimensions", () => {
    const history: AgentHistoryItem[] = [
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

  it("unknown type falls back to 通用 portrait flow", () => {
    const { ordered } = activeDimensions("不存在的类型", "simple", []);
    const generic = activeDimensions("通用", "simple", []);
    expect(ordered).toEqual(generic.ordered);
    expect(ordered).toContain("subject");
    expect(ordered).toContain("person_type");
  });
});
