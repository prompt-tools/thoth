import { describe, expect, it } from "vitest";
import "./init";
import { renderPrompt } from "./adapters";
import { getBriefText, renderMarkdown, buildPromptBrief } from "./brief";
import { getAllOptionSets, getAllTargets, resolveWorkType } from "./registry";
import { targetTools } from "./targets";
import type { OptionSet, PromptSelections, TargetToolConfig, TargetToolId, WorkTypeConfig, WorkTypeId } from "./types";
import { IMAGE_TARGET_ID } from "./types";
import {
  validateAdapterCompleteness,
  validateOptionIdFormat,
  validateOptionIdsUnique,
  validateOptionTargetRefs,
  validateSafetyDefaultsIntegrity,
  validateTargetConfig,
  validateWorkTypeConfig,
} from "./validation";

const imageWorkType = resolveWorkType("image_prompt");

const imageSelections: PromptSelections = {
  use_case: "image_use_case:social_media_post",
  subject: "image_subject:hero_product",
  scene: "image_scene:studio_env",
  composition: "image_composition:centered",
  lighting: "image_lighting:soft_dreamy",
  art_style: "image_art_style:photorealistic",
  constraints: [
    "image_constraints:no_ip_celebrity",
    "image_constraints:no_nsfw",
    "image_constraints:no_bad_anatomy",
    "image_constraints:no_low_quality",
  ],
};

describe("prompt configuration validation (image-only)", () => {
  const optionSets = getAllOptionSets();

  it("keeps option ids unique across reusable catalogs", () => {
    expect(validateOptionIdsUnique(optionSets)).toEqual([]);
  });

  it("validates option IDs have namespace prefix matching their optionSet (OPT-05)", () => {
    expect(validateOptionIdFormat(optionSets)).toEqual([]);
  });

  it("returns duplicate option IDs when they appear across sets (TEST-01)", () => {
    const collidingA: OptionSet = {
      id: "collide_a",
      version: "0.1.0",
      label: { en: "A", zh: "A" },
      options: [
        {
          id: "shared_id",
          version: "0.1.0",
          label: { en: "Shared", zh: "共享" },
          plain: { en: "", zh: "" },
          professionalTerms: [],
          promptFragment: { en: "", zh: "" },
          appliesTo: ["generic_image"],
        },
      ],
    };
    const collidingB: OptionSet = {
      id: "collide_b",
      version: "0.1.0",
      label: { en: "B", zh: "B" },
      options: [
        {
          id: "shared_id",
          version: "0.1.0",
          label: { en: "Shared", zh: "共享" },
          plain: { en: "", zh: "" },
          professionalTerms: [],
          promptFragment: { en: "", zh: "" },
          appliesTo: ["generic_image"],
        },
      ],
    };
    expect(validateOptionIdsUnique([collidingA, collidingB])).toEqual(["shared_id"]);
  });

  it("accepts the image_prompt work type schema", () => {
    expect(validateWorkTypeConfig(imageWorkType, optionSets)).toEqual([]);
  });

  it("requires configured target tools to expose adapter guidance", () => {
    expect(targetTools.flatMap(validateTargetConfig)).toEqual([]);
  });

  it("covers the required image prompt dimensions", () => {
    const questionIds = imageWorkType.questions.map((question) => question.id);
    expect(questionIds).toEqual(
      expect.arrayContaining([
        "use_case",
        "subject",
        "scene",
        "composition",
        "lighting",
        "art_style",
        "constraints",
      ]),
    );
  });

  it("validates option appliesTo target refs exist (TEST-04)", () => {
    expect(validateOptionTargetRefs()).toEqual([]);
  });

  it("confirms all safetyDefaults option IDs resolve to registered options (CI)", () => {
    const errors = validateSafetyDefaultsIntegrity(targetTools, optionSets);
    expect(errors).toEqual([]);
  });

  it("detects unknown option IDs in safetyDefaults", () => {
    const bad: TargetToolConfig = {
      id: "test_bad_target" as TargetToolId,
      version: "0.1.0",
      label: { zh: "Bad", en: "Bad" },
      description: { zh: "", en: "" },
      adaptationNote: { zh: "test", en: "test" },
      prefer: ["subject"],
      suppress: [],
      safetyDefaults: ["nonexistent_option", "another_fake"],
      supportedWorkTypes: ["image_prompt"],
    };
    const errors = validateSafetyDefaultsIntegrity([bad], optionSets);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toContain("nonexistent_option");
  });

  it("warns when safety defaults are deselected from generic_image output (TEST-08)", () => {
    const unsafe: PromptSelections = {
      ...imageSelections,
      constraints: ["image_constraints:no_cluttered"],
    };

    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: unsafe,
    });

    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    const zhWarnings = result.warnings.map((w) => w.zh).join("");
    expect(zhWarnings).toContain("已取消预选的安全约束");
    expect(zhWarnings).toContain("image_constraints:no_ip_celebrity");
  });

  it("respects maxSelections cap on multi-select constraints (TEST-09)", () => {
    const overMax: PromptSelections = {
      ...imageSelections,
      constraints: [
        "image_constraints:no_ip_celebrity",
        "image_constraints:no_nsfw",
        "image_constraints:no_bad_anatomy",
        "image_constraints:no_low_quality",
        "image_constraints:no_text",
        "image_constraints:no_watermark",
      ],
    };

    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: overMax,
    });

    expect(result.zhPrompt.length).toBeGreaterThan(0);
    const constraintsItem = result.brief.items.find((i) => i.questionId === "constraints");
    expect(constraintsItem).toBeDefined();
    expect(constraintsItem!.selectedOptions.length).toBeLessThanOrEqual(4);
  });
});

// I-03: Singleton tripwires — kept after I-01 (work-type registry collapse)
// and I-02 (target+adapter registry collapse). Post-fold these three checks
// are tautological at the type level (resolveWorkType / getAllTargets /
// getAllAdapters all return single-literal singletons). They survive here
// as fixture-sanity guards: if anyone removes the singleton export or breaks
// the registry's "always returns the one valid value" invariant, these fail
// loudly instead of letting other tests pass by accident.
//
// Same pattern as sister repo 15.10 F3 (relabel-tripwires-into-describe-blocks).
describe("singleton tripwires (I-01/I-02 invariants)", () => {
  it("validateAdapterCompleteness returns no errors (every registered target has an adapter)", () => {
    expect(validateAdapterCompleteness()).toEqual([]);
  });

  it("resolveWorkType returns the registered image_prompt singleton", () => {
    const resolved = resolveWorkType("image_prompt");
    expect(resolved.id).toBe("image_prompt");
    expect(resolved.questions.length).toBeGreaterThan(0);
  });

  it("getAllTargets returns exactly the generic_image singleton", () => {
    const targets = getAllTargets();
    expect(targets.length).toBe(1);
    expect(targets[0]?.id).toBe("generic_image");
  });
});

describe("brief utilities (image)", () => {
  it("getBriefText returns correct fragment for a question", () => {
    const brief = buildPromptBrief({
      workType: imageWorkType,
      targetToolId: IMAGE_TARGET_ID,
      rawIntent: "",
      selections: imageSelections,
    });
    const zh = getBriefText(brief, "subject", "zh");
    expect(zh.length).toBeGreaterThan(0);
  });

  it("renderMarkdown produces valid markdown with all sections", () => {
    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: imageSelections,
    });
    const md = renderMarkdown(result);
    expect(md).toContain("# Image Prompt Brief");
    expect(md).toContain("## Chinese Prompt");
    expect(md).toContain("## English Prompt");
    expect(md).toContain("**Target:** generic_image");
  });

  it("validateWorkTypeConfig detects missing optionSetId on required choice", () => {
    const bad: WorkTypeConfig = {
      id: "bad_wt" as WorkTypeId,
      version: "0.1.0",
      label: { zh: "X", en: "X" },
      description: { zh: "", en: "" },
      questions: [
        {
          id: "q",
          version: "0.1.0",
          title: { zh: "Q", en: "Q" },
          helper: { zh: "", en: "" },
          mode: "single",
          level: "core",
          required: true,
        },
      ],
    };
    const errors = validateWorkTypeConfig(bad, []);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("needs optionSetId");
  });
});

describe("riskHint completeness (D-03)", () => {
  const allSets = getAllOptionSets();

  it("every option has riskHint field (not undefined)", () => {
    const missing: string[] = [];
    for (const set of allSets) {
      for (const opt of set.options) {
        if (opt.riskHint === undefined) {
          missing.push(`${opt.id} (set: ${set.id})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("safety-default constraint options have substantive riskHint", () => {
    const violations: string[] = [];
    const set = allSets.find((s) => s.id === "image_constraints");
    expect(set).toBeDefined();
    const safetyDefaultIds = new Set([
      "image_constraints:no_ip_celebrity",
      "image_constraints:no_nsfw",
      "image_constraints:no_bad_anatomy",
      "image_constraints:no_low_quality",
    ]);
    for (const opt of set!.options) {
      if (!safetyDefaultIds.has(opt.id)) continue;
      if (!opt.riskHint || opt.riskHint.zh.length === 0 || opt.riskHint.en.length === 0) {
        violations.push(`${opt.id}: riskHint missing or empty zh/en`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("LOW-risk catalogs have riskHint present", () => {
    const missing: string[] = [];
    const lowRiskIds = ["image_lighting", "image_art_style", "image_scene", "image_use_case"];
    for (const setId of lowRiskIds) {
      const set = allSets.find((s) => s.id === setId);
      if (!set) continue;
      for (const opt of set.options) {
        if (opt.riskHint === undefined) {
          missing.push(`${opt.id} (set: ${set.id})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("image prompt rendering", () => {
  it("renders non-empty zh/en prompt for image_prompt work type", () => {
    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: imageSelections,
    });

    expect(result.zhPrompt.length).toBeGreaterThan(0);
    expect(result.enPrompt.length).toBeGreaterThan(0);
    expect(result.targetToolId).toBe("generic_image");
  });

  it("injects negative prompt text from target config (medium default)", () => {
    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: imageSelections,
    });

    expect(result.zhPrompt).toContain("低画质");
    expect(result.enPrompt).toContain("low quality");
  });

  it("light negPromptTier uses light-tier text but NOT medium+ terms", () => {
    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: imageSelections,
      negPromptTier: "light",
    });

    expect(result.zhPrompt).toContain("低画质");
    expect(result.zhPrompt).toContain("模糊");
    expect(result.zhPrompt).not.toContain("水印");
  });

  it("heavy negPromptTier includes heavy-only negative text", () => {
    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: imageSelections,
      negPromptTier: "heavy",
    });

    expect(result.zhPrompt).toContain("混沌背景");
    expect(result.zhPrompt).toContain("比例失调");
  });

  it("brief has correct workTypeId and targetToolId", () => {
    const result = renderPrompt({
      workType: imageWorkType,
      rawIntent: "",
      selections: imageSelections,
    });

    expect(result.brief.workTypeId).toBe("image_prompt");
    expect(result.brief.targetToolId).toBe("generic_image");
    expect(result.brief.items.length).toBeGreaterThan(0);
  });
});

describe("suggests field validation (DIFF-03)", () => {
  const allSets = getAllOptionSets();
  const allQuestionIds = new Set(imageWorkType.questions.map((q) => q.id));

  it("all suggests keys reference valid question IDs", () => {
    const invalid: string[] = [];
    for (const set of allSets) {
      for (const opt of set.options) {
        if (!opt.suggests) continue;
        for (const key of Object.keys(opt.suggests)) {
          if (!allQuestionIds.has(key)) {
            invalid.push(`${opt.id}: suggests key "${key}" is not a valid question ID`);
          }
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("all suggests values reference registered option IDs", () => {
    const allOptionIds = new Set(allSets.flatMap((set) => set.options.map((o) => o.id)));
    const invalid: string[] = [];

    for (const set of allSets) {
      for (const opt of set.options) {
        if (!opt.suggests) continue;
        for (const [questionId, suggestedIds] of Object.entries(opt.suggests)) {
          for (const suggestedId of suggestedIds) {
            if (!allOptionIds.has(suggestedId)) {
              invalid.push(
                `${opt.id}: suggests["${questionId}"] references unknown option "${suggestedId}"`,
              );
            }
          }
        }
      }
    }
    expect(invalid).toEqual([]);
  });
});
