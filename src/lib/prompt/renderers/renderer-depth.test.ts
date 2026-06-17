import { describe, expect, it } from "vitest";
import "../init";
import { renderPrompt } from "../adapters";
import { resolveWorkType, getAllAdapters } from "../registry";
import type { TargetToolId, WorkTypeId, PromptSelections } from "../types";

type Spec = {
  targetToolId: TargetToolId;
  workTypeId: WorkTypeId;
  minimalSelections: PromptSelections;
  richSelections: PromptSelections;
};

const IMAGE_SPECS: Spec[] = [
  {
    targetToolId: "generic_image",
    workTypeId: "image_prompt",
    minimalSelections: {},
    richSelections: {
      use_case: ["image_use_case:social_media_post"],
      subject: ["image_subject:single_person"],
    },
  },
];

describe("renderer depth — spec coverage tripwire", () => {
  it("every registered adapter has a Spec entry in this file", () => {
    const registered = getAllAdapters()
      .map((a) => a.target.id)
      .sort();
    const specced = IMAGE_SPECS.map((s) => s.targetToolId).sort();
    expect(specced).toEqual(registered);
  });
});

describe("renderer depth — cross-target invariants (N-04)", () => {
  it.each(IMAGE_SPECS)(
    "$targetToolId: minimal selections produce non-empty zh and en prompts",
    (spec) => {
      const workType = resolveWorkType(spec.workTypeId);
      const rendered = renderPrompt({
        workType,
        rawIntent: "",
        selections: spec.minimalSelections,
      });
      expect(rendered.zhPrompt.length).toBeGreaterThan(0);
      expect(rendered.enPrompt.length).toBeGreaterThan(0);
    },
  );

  it.each(IMAGE_SPECS)(
    "$targetToolId: richer selections produce longer output than minimal",
    (spec) => {
      const workType = resolveWorkType(spec.workTypeId);
      const minimal = renderPrompt({
        workType,
        rawIntent: "",
        selections: spec.minimalSelections,
      });
      const rich = renderPrompt({
        workType,
        rawIntent: "",
        selections: spec.richSelections,
      });
      expect(rich.zhPrompt.length).toBeGreaterThanOrEqual(minimal.zhPrompt.length);
      expect(rich.enPrompt.length).toBeGreaterThanOrEqual(minimal.enPrompt.length);
      const strictlyLonger =
        rich.zhPrompt.length > minimal.zhPrompt.length ||
        rich.enPrompt.length > minimal.enPrompt.length;
      expect(strictlyLonger).toBe(true);
    },
  );

  it.each(IMAGE_SPECS)(
    "$targetToolId: zh and en outputs are both populated (parallel emptiness invariant)",
    (spec) => {
      const workType = resolveWorkType(spec.workTypeId);
      const rendered = renderPrompt({
        workType,
        rawIntent: "",
        selections: spec.richSelections,
      });
      const zhEmpty = rendered.zhPrompt.trim().length === 0;
      const enEmpty = rendered.enPrompt.trim().length === 0;
      expect(zhEmpty).toBe(enEmpty);
      expect(zhEmpty).toBe(false);
    },
  );
});
