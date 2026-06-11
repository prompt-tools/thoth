import { describe, it, expect } from "vitest";
import "../init";
import { imagePromptWorkType } from "./image-prompt.worktype";
import { imagePromptAgentWorkType } from "./image-prompt-agent.worktype";
import { buildCatalogManifest } from "../agent/catalog-manifest";

/** Phase B: 6 new prototype-only dimensions, with their expected option counts. */
const PHASE_B_EXPECTED: Record<string, number> = {
  camera: 10,
  pose: 8,
  outfit: 7,
  hair: 9,
  product_material: 9,
  weather: 7,
};
const PHASE_B_IDS = Object.keys(PHASE_B_EXPECTED);

/** P4: 4 animal attribute dims (scoped to pet_animal / wildlife). */
const PHASE_P4_EXPECTED: Record<string, number> = {
  animal_breed: 20,
  animal_coat: 10,
  animal_pose: 8,
  animal_expression: 6,
};
const PHASE_P4_IDS = Object.keys(PHASE_P4_EXPECTED);

/** P5: 4 architecture attribute dims (scoped to architectural_exterior / interior_space). */
const PHASE_P5_EXPECTED: Record<string, number> = {
  arch_style: 12,
  arch_type: 12,
  arch_material: 10,
  arch_viewpoint: 8,
};
const PHASE_P5_IDS = Object.keys(PHASE_P5_EXPECTED);

/** P6: portrait expression dim (scoped to single_person / character_design). */
const PHASE_P6_EXPECTED: Record<string, number> = {
  portrait_expression: 10,
};
const PHASE_P6_IDS = Object.keys(PHASE_P6_EXPECTED);

/** Phase A: the prototype worktype splits perspective → framing + camera_angle,
 *  while the canonical (main-app) worktype is left untouched. */
describe("imagePromptAgentWorkType (Phase A split)", () => {
  const agentIds = imagePromptAgentWorkType.questions.map((q) => q.id);

  it("replaces perspective with framing + camera_angle", () => {
    expect(agentIds).not.toContain("perspective");
    expect(agentIds).toContain("framing");
    expect(agentIds).toContain("camera_angle");
  });

  it("leaves the canonical worktype (main app) untouched", () => {
    const canonicalIds = imagePromptWorkType.questions.map((q) => q.id);
    expect(canonicalIds).toContain("perspective");
    expect(canonicalIds).not.toContain("framing");
    expect(canonicalIds).not.toContain("camera_angle");
  });

  it("preserves canonical dimensions (besides the perspective split + Phase B/P4/P5/P6 additions)", () => {
    const canonicalOther = imagePromptWorkType.questions
      .map((q) => q.id)
      .filter((id) => id !== "perspective");
    const agentOther = agentIds.filter(
      (id) =>
        id !== "framing" &&
        id !== "camera_angle" &&
        !PHASE_B_IDS.includes(id) &&
        !PHASE_P4_IDS.includes(id) &&
        !PHASE_P5_IDS.includes(id) &&
        !PHASE_P6_IDS.includes(id)
    );
    expect(agentOther).toEqual(canonicalOther);
  });

  it("agent manifest surfaces framing (4) and camera_angle (12) options", () => {
    const manifest = buildCatalogManifest();
    const framing = manifest.find((d) => d.questionId === "framing");
    const cameraAngle = manifest.find((d) => d.questionId === "camera_angle");
    expect(framing?.options).toHaveLength(4);
    expect(cameraAngle?.options).toHaveLength(12);
    expect(manifest.find((d) => d.questionId === "perspective")).toBeUndefined();
  });
});

describe("imagePromptAgentWorkType (P4 animal attribute dims)", () => {
  const agentIds = imagePromptAgentWorkType.questions.map((q) => q.id);

  it("adds all 4 animal dims to the agent worktype", () => {
    for (const id of PHASE_P4_IDS) expect(agentIds).toContain(id);
  });

  it("does NOT add animal dims to the canonical (main-app) worktype", () => {
    const canonicalIds = imagePromptWorkType.questions.map((q) => q.id);
    for (const id of PHASE_P4_IDS) expect(canonicalIds).not.toContain(id);
  });

  it("registers each animal option set with the expected option count", () => {
    const manifest = buildCatalogManifest();
    for (const [id, count] of Object.entries(PHASE_P4_EXPECTED)) {
      const dim = manifest.find((d) => d.questionId === id);
      expect(dim, `dimension ${id} missing from manifest`).toBeDefined();
      expect(dim?.options).toHaveLength(count);
    }
  });

  it("animal dims are scoped to pet_animal / wildlife", () => {
    const breedQ = imagePromptAgentWorkType.questions.find((q) => q.id === "animal_breed");
    expect(breedQ?.scopeToOption).toContain("image_subject:pet_animal");
    const expressionQ = imagePromptAgentWorkType.questions.find((q) => q.id === "animal_expression");
    expect(expressionQ?.scopeToOption).toContain("image_subject:pet_animal");
  });
});

describe("imagePromptAgentWorkType (P5 architecture attribute dims)", () => {
  const agentIds = imagePromptAgentWorkType.questions.map((q) => q.id);

  it("adds all 4 architecture dims to the agent worktype", () => {
    for (const id of PHASE_P5_IDS) expect(agentIds).toContain(id);
  });

  it("does NOT add architecture dims to the canonical worktype", () => {
    const canonicalIds = imagePromptWorkType.questions.map((q) => q.id);
    for (const id of PHASE_P5_IDS) expect(canonicalIds).not.toContain(id);
  });

  it("registers each architecture option set with the expected option count", () => {
    const manifest = buildCatalogManifest();
    for (const [id, count] of Object.entries(PHASE_P5_EXPECTED)) {
      const dim = manifest.find((d) => d.questionId === id);
      expect(dim, `dimension ${id} missing from manifest`).toBeDefined();
      expect(dim?.options).toHaveLength(count);
    }
  });

  it("architecture dims are scoped to architectural_exterior / interior_space", () => {
    const styleQ = imagePromptAgentWorkType.questions.find((q) => q.id === "arch_style");
    expect(styleQ?.scopeToOption).toContain("image_subject:architectural_exterior");
    expect(styleQ?.scopeToOption).toContain("image_subject:interior_space");
  });
});

describe("imagePromptAgentWorkType (P6 portrait expression dim)", () => {
  const agentIds = imagePromptAgentWorkType.questions.map((q) => q.id);

  it("adds portrait_expression to the agent worktype", () => {
    expect(agentIds).toContain("portrait_expression");
  });

  it("does NOT add portrait_expression to the canonical worktype", () => {
    const canonicalIds = imagePromptWorkType.questions.map((q) => q.id);
    expect(canonicalIds).not.toContain("portrait_expression");
  });

  it("registers portrait_expression with 10 options", () => {
    const manifest = buildCatalogManifest();
    const dim = manifest.find((d) => d.questionId === "portrait_expression");
    expect(dim, "portrait_expression missing from manifest").toBeDefined();
    expect(dim?.options).toHaveLength(10);
  });

  it("portrait_expression is scoped to single_person / character_design", () => {
    const q = imagePromptAgentWorkType.questions.find((q) => q.id === "portrait_expression");
    expect(q?.scopeToOption).toContain("image_subject:single_person");
    expect(q?.scopeToOption).toContain("image_subject:character_design");
  });

  it("pose/outfit/hair are scoped to portrait subjects", () => {
    const poseQ = imagePromptAgentWorkType.questions.find((q) => q.id === "pose");
    expect(poseQ?.scopeToOption).toContain("image_subject:single_person");
    const outfitQ = imagePromptAgentWorkType.questions.find((q) => q.id === "outfit");
    expect(outfitQ?.scopeToOption).toContain("image_subject:single_person");
    const hairQ = imagePromptAgentWorkType.questions.find((q) => q.id === "hair");
    expect(hairQ?.scopeToOption).toContain("image_subject:single_person");
  });
});

describe("imagePromptAgentWorkType (Phase B new dimensions)", () => {
  const agentIds = imagePromptAgentWorkType.questions.map((q) => q.id);

  it("adds all 6 new dimensions to the prototype worktype", () => {
    for (const id of PHASE_B_IDS) expect(agentIds).toContain(id);
  });

  it("does NOT add them to the canonical (main-app) worktype", () => {
    const canonicalIds = imagePromptWorkType.questions.map((q) => q.id);
    for (const id of PHASE_B_IDS) expect(canonicalIds).not.toContain(id);
  });

  it("registers each new option set with the expected option count", () => {
    const manifest = buildCatalogManifest();
    for (const [id, count] of Object.entries(PHASE_B_EXPECTED)) {
      const dim = manifest.find((d) => d.questionId === id);
      expect(dim, `dimension ${id} missing from manifest`).toBeDefined();
      expect(dim?.options).toHaveLength(count);
    }
  });
});
