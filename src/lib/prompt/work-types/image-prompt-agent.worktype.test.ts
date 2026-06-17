import { describe, it, expect } from "vitest";
import "../init";
import { imagePromptWorkType } from "./image-prompt.worktype";
import { imagePromptAgentWorkType } from "./image-prompt-agent.worktype";
import { buildCatalogManifest } from "../agent/catalog-manifest";

const PORTRAIT_DIM_EXPECTED: Record<string, number> = {
  camera: 10,
  pose: 8,
  outfit: 7,
  hair: 9,
  portrait_expression: 10,
  person_type: 8,
  gender_presentation: 4,
  age_band: 5,
  skin_tone: 6,
  face_features: 8,
  body_type: 6,
  character_archetype: 10,
  character_render_style: 8,
  character_interaction: 8,
};

const NON_PORTRAIT_DIM_IDS = [
  "product_material",
  "weather",
  "animal_breed",
  "animal_coat",
  "animal_pose",
  "animal_expression",
  "arch_style",
  "arch_type",
  "arch_material",
  "arch_viewpoint",
  "food_state",
  "food_tableware_styling",
];

describe("imagePromptAgentWorkType portrait-only dimensions", () => {
  const agentIds = imagePromptAgentWorkType.questions.map((q) => q.id);

  it("replaces perspective with framing + camera_angle", () => {
    expect(agentIds).not.toContain("perspective");
    expect(agentIds).toContain("framing");
    expect(agentIds).toContain("camera_angle");
  });

  it("leaves the canonical worktype perspective split untouched", () => {
    const canonicalIds = imagePromptWorkType.questions.map((q) => q.id);
    expect(canonicalIds).toContain("perspective");
    expect(canonicalIds).not.toContain("framing");
    expect(canonicalIds).not.toContain("camera_angle");
  });

  it("adds the portrait and character dimension set", () => {
    for (const id of Object.keys(PORTRAIT_DIM_EXPECTED)) {
      expect(agentIds).toContain(id);
    }
  });

  it("does not expose non-portrait subject-specific dimensions", () => {
    for (const id of NON_PORTRAIT_DIM_IDS) {
      expect(agentIds).not.toContain(id);
    }
  });

  it("manifest emits each portrait dimension with expected option counts", () => {
    const manifest = buildCatalogManifest();
    for (const [id, count] of Object.entries(PORTRAIT_DIM_EXPECTED)) {
      const dim = manifest.find((d) => d.questionId === id);
      expect(dim, `dimension ${id} missing from manifest`).toBeDefined();
      expect(dim?.options).toHaveLength(count);
    }
  });

  it("subject manifest contains only portrait/person subjects", () => {
    const manifest = buildCatalogManifest();
    const subject = manifest.find((d) => d.questionId === "subject");
    const ids = subject?.options.map((o) => o.id) ?? [];
    expect(ids).toContain("image_subject:beautiful_woman");
    expect(ids).toContain("image_subject:handsome_man");
    expect(ids).toContain("image_subject:otome_character");
    expect(ids).not.toContain("image_subject:hero_product");
    expect(ids).not.toContain("image_subject:pet_animal");
    expect(ids).not.toContain("image_subject:food_beverage");
  });

  it("manifest hides non-portrait use cases and art styles", () => {
    const manifest = buildCatalogManifest();
    const useCaseIds = manifest.find((d) => d.questionId === "use_case")?.options.map((o) => o.id) ?? [];
    const artStyleIds = manifest.find((d) => d.questionId === "art_style")?.options.map((o) => o.id) ?? [];

    expect(useCaseIds).toContain("image_use_case:avatar");
    expect(useCaseIds).toContain("image_use_case:poster");
    expect(useCaseIds).not.toContain("image_use_case:product_photo");
    expect(useCaseIds).not.toContain("image_use_case:ecommerce_main");
    expect(useCaseIds).not.toContain("image_use_case:menu");
    expect(useCaseIds).not.toContain("image_use_case:packaging");

    expect(artStyleIds).toContain("image_art_style:portrait_photography");
    expect(artStyleIds).not.toContain("image_art_style:product_photography");
    expect(artStyleIds).not.toContain("image_art_style:food_photography");
    expect(artStyleIds).not.toContain("image_art_style:architectural_photography");
  });

  it("new portrait dimensions are scoped to portrait subjects", () => {
    const personTypeQ = imagePromptAgentWorkType.questions.find((q) => q.id === "person_type");
    const archetypeQ = imagePromptAgentWorkType.questions.find((q) => q.id === "character_archetype");
    expect(personTypeQ?.scopeToOption).toContain("image_subject:beautiful_woman");
    expect(personTypeQ?.scopeToOption).toContain("image_subject:otome_character");
    expect(archetypeQ?.scopeToOption).toContain("image_subject:game_character");
    expect(archetypeQ?.scopeToOption).not.toContain("image_subject:single_person");
  });
});
