import { describe, it, expect } from "vitest";
import "../init";
import { activeDimensions } from "./active-dimensions";
import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";

const manifest = buildCatalogManifest();

/** Pick the first option id for a given questionId from the manifest. */
function firstOpt(qid: string): string {
  const dim = manifest.find((d) => d.questionId === qid)!;
  return dim.options[0].id;
}

describe("activeDimensions", () => {
  // ★ Monotonicity: appending one asked id strictly shrinks |ordered|
  it("monotonicity: each answered dimension strictly reduces ordered count", () => {
    const types = ["人像", "产品/静物", "场景/氛围", "动物", "食物/饮品", "通用"];
    for (const type of types) {
      const history: AgentHistoryItem[] = [];
      let prev = activeDimensions(type, "simple", history).ordered.length;

      // Walk through all active dimensions one by one
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

  // ★ Suppress: portrait + close_up → pose/outfit removed
  it("suppress: portrait close_up removes pose and outfit from active", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "framing", selectedOptionIds: ["image_framing:close_up"] },
    ];
    const { ordered } = activeDimensions("人像", "simple", history);
    expect(ordered).not.toContain("pose");
    expect(ordered).not.toContain("outfit");
  });

  it("suppress: portrait wide_shot keeps pose and outfit in active", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "framing", selectedOptionIds: ["image_framing:wide_shot"] },
    ];
    // pose/outfit are secondary, so only visible at standard+
    const { ordered: std } = activeDimensions("人像", "standard", history);
    expect(std).toContain("pose");
    expect(std).toContain("outfit");
  });

  // ★ Precision progression: simple ⊆ standard ⊆ detailed
  it("precision progression: simple ⊆ standard ⊆ detailed", () => {
    const types = ["人像", "产品/静物", "场景/氛围", "动物", "食物/饮品"];
    for (const type of types) {
      const simple = activeDimensions(type, "simple", []).ordered;
      const standard = activeDimensions(type, "standard", []).ordered;
      const detailed = activeDimensions(type, "detailed", []).ordered;

      // simple ⊆ standard
      for (const qid of simple) {
        expect(standard).toContain(qid);
      }
      // standard ⊆ detailed
      for (const qid of standard) {
        expect(detailed).toContain(qid);
      }
      // strict progression for types with secondary
      if (type !== "通用") {
        expect(standard.length).toBeGreaterThanOrEqual(simple.length);
        expect(detailed.length).toBeGreaterThanOrEqual(standard.length);
      }
    }
  });

  // ★ Done: all active asked → done=true
  it("done: returns true when all active dimensions are asked", () => {
    const types = ["人像", "产品/静物", "通用"];
    for (const type of types) {
      const history: AgentHistoryItem[] = [];
      for (let i = 0; i < 30; i++) {
        const { ordered, done } = activeDimensions(type, "simple", history);
        if (done) {
          expect(ordered.length).toBe(0);
          break;
        }
        history.push({ questionId: ordered[0], selectedOptionIds: [firstOpt(ordered[0])] });
      }
      const finalResult = activeDimensions(type, "simple", history);
      expect(finalResult.done).toBe(true);
    }
  });

  // ★ 动物 constraints ordering: constraints must appear before aspect_ratio
  it("动物 simple: constraints appears before aspect_ratio", () => {
    const { ordered } = activeDimensions("动物", "simple", []);
    const idxConstraints = ordered.indexOf("constraints");
    const idxAspect = ordered.indexOf("aspect_ratio");
    expect(idxConstraints).toBeGreaterThan(-1);
    expect(idxAspect).toBeGreaterThan(-1);
    expect(idxConstraints).toBeLessThan(idxAspect);
  });

  // 通用 type works
  it("通用 fallback type returns valid dimensions", () => {
    const { ordered, done } = activeDimensions("通用", "simple", []);
    expect(ordered.length).toBeGreaterThan(0);
    expect(done).toBe(false);
    expect(ordered).toContain("subject");
    expect(ordered).toContain("scene");
  });

  // Unknown type falls back to 通用
  it("unknown type falls back to 通用", () => {
    const { ordered } = activeDimensions("不存在的类型", "simple", []);
    const generic = activeDimensions("通用", "simple", []);
    expect(ordered).toEqual(generic.ordered);
  });
});
