import { describe, it, expect } from "vitest";
import "../init";
import { resolveVisibleOptions } from "./options-resolver";
import { buildCatalogManifest } from "./catalog-manifest";

const manifest = buildCatalogManifest();

describe("resolveVisibleOptions", () => {
  // Find the camera dimension and a known portrait option
  const cameraDim = manifest.find((d) => d.questionId === "camera")!;
  const portrait85 = cameraDim.options.find((o) => o.id.includes("85mm"))!;

  // Find the framing dimension and a known wide-shot option
  const framingDim = manifest.find((d) => d.questionId === "framing")!;
  const wideShot = framingDim.options.find((o) => o.id.includes("wide_shot"))!;

  it("drops a hard-conflicting option and reports it in conflictDropped", () => {
    // Select wide_shot → should block 85mm_portrait (hard conflict pair)
    const allCameraIds = cameraDim.options.map((o) => o.id);
    const { visible, conflictDropped } = resolveVisibleOptions(
      cameraDim,
      allCameraIds,
      [wideShot.id],
    );

    // 85mm_portrait should be blocked by wide_shot (known hard conflict pair)
    expect(conflictDropped).toContain(portrait85.id);
    expect(visible.some((o) => o.id === portrait85.id)).toBe(false);
    // conflictDropped should only contain ids that were in allowOptionIds
    for (const id of conflictDropped) {
      expect(allCameraIds).toContain(id);
    }
  });

  it("does not drop any options when nothing is selected", () => {
    const allCameraIds = cameraDim.options.map((o) => o.id);
    const { visible, conflictDropped } = resolveVisibleOptions(
      cameraDim,
      allCameraIds,
      [],
    );
    expect(conflictDropped).toHaveLength(0);
    expect(visible.length).toBe(allCameraIds.length);
  });

  it("respects allowOptionIds — only returns options in the allow set", () => {
    const subset = [portrait85.id];
    const { visible } = resolveVisibleOptions(cameraDim, subset, []);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(portrait85.id);
  });
});
