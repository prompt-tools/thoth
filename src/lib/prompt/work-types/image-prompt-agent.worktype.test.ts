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

  it("preserves canonical dimensions (besides the perspective split + Phase B additions)", () => {
    const canonicalOther = imagePromptWorkType.questions
      .map((q) => q.id)
      .filter((id) => id !== "perspective");
    const agentOther = agentIds.filter(
      (id) =>
        id !== "framing" &&
        id !== "camera_angle" &&
        !PHASE_B_IDS.includes(id)
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
