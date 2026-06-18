import { describe, it, expect } from "vitest";
import "../init";
import { GRADIENT } from "./gradient";
import { buildCatalogManifest } from "./catalog-manifest";

const VALID_IDS = new Set([
  "use_case", "subject", "scene", "composition", "lighting", "art_style",
  "constraints", "color_palette", "mood", "framing", "camera_angle",
  "aspect_ratio", "detail_level", "post_processing", "time_season",
  "camera", "pose", "outfit", "hair", "portrait_expression",
  "person_type", "gender_presentation", "age_band", "skin_tone",
  "face_features", "body_type", "character_archetype",
  "character_render_style", "character_interaction",
]);

const NON_PORTRAIT_IDS = new Set([
  "product_material", "weather", "animal_breed", "animal_coat",
  "animal_pose", "animal_expression", "arch_style", "arch_type",
  "arch_material", "arch_viewpoint", "food_state", "food_tableware_styling",
]);

const manifest = buildCatalogManifest();
const dimOptions = new Map(manifest.map((d) => [d.questionId, new Set(d.options.map((o) => o.id))]));

describe("gradient data integrity", () => {
  it("all questionIds are in the valid IDs set", () => {
    const violations: string[] = [];
    for (const tier of ["essential", "tertiary"] as const) {
      for (const item of GRADIENT.shared[tier]) {
        if (!VALID_IDS.has(item.questionId)) violations.push(`shared.${tier}: ${item.questionId}`);
      }
    }
    for (const pt of GRADIENT.primaryTypes) {
      for (const tier of ["essential", "secondary", "tertiary"] as const) {
        for (const item of pt[tier]) {
          if (!VALID_IDS.has(item.questionId)) violations.push(`${pt.type}.${tier}: ${item.questionId}`);
        }
      }
      for (const qid of pt.order) {
        if (!VALID_IDS.has(qid)) violations.push(`${pt.type}.order: ${qid}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("all precompiled condition.values are real catalog option ids", () => {
    const violations: string[] = [];
    for (const pt of GRADIENT.primaryTypes) {
      for (const cond of pt.conditional) {
        if (!cond.condition) continue;
        const realOpts = dimOptions.get(cond.condition.dimension);
        for (const val of cond.condition.values) {
          if (!realOpts || !realOpts.has(val)) {
            violations.push(`${pt.type}/${cond.questionId}: ${val} not in ${cond.condition.dimension}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("every primaryType has non-empty essential and order", () => {
    for (const pt of GRADIENT.primaryTypes) {
      expect(pt.essential.length).toBeGreaterThan(0);
      expect(pt.order.length).toBeGreaterThan(0);
    }
  });

  it("all scopeToOption values are real subject option ids", () => {
    const subjectOpts = dimOptions.get("subject") ?? new Set<string>();
    const violations: string[] = [];
    for (const pt of GRADIENT.primaryTypes) {
      for (const tier of ["essential", "secondary", "tertiary"] as const) {
        for (const item of pt[tier]) {
          for (const val of item.scopeToOption ?? []) {
            if (!subjectOpts.has(val))
              violations.push(`${pt.type}.${tier}/${item.questionId}: ${val}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("通用 fallback type exists but only uses portrait dimensions", () => {
    const generic = GRADIENT.primaryTypes.find((p) => p.type === "通用");
    expect(generic).toBeDefined();
    const essIds = generic!.essential.map((x) => x.questionId);
    expect(essIds).toContain("subject");
    expect(essIds).toContain("person_type");
    expect(essIds).toContain("gender_presentation");
    expect(essIds).toContain("portrait_expression");
    expect(essIds).not.toContain("scene");
    for (const id of [...generic!.order, ...essIds]) {
      expect(NON_PORTRAIT_IDS.has(id)).toBe(false);
    }
  });

  it("primary types are reduced to portrait and portrait fallback", () => {
    expect(GRADIENT.primaryTypes.map((p) => p.type).sort()).toEqual(["人像", "通用"]);
  });

  it("constraints are not agent-askable (automatic at render time)", () => {
    const sharedEssential = GRADIENT.shared.essential.map((x) => x.questionId);
    expect(sharedEssential).not.toContain("constraints");
    const manifestIds = buildCatalogManifest().map((d) => d.questionId);
    expect(manifestIds).not.toContain("constraints");
  });
});
