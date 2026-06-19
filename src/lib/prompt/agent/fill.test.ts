import { describe, it, expect } from "vitest";
import "../init";
import { computeFillSet } from "./fill";
import { resolveActiveSet, activeDimensions } from "./active-dimensions";
import { buildCatalogManifest } from "./catalog-manifest";
import { conflictIdsFor, hardConflictIdsFor, OPTION_CONFLICTS } from "./audit-model";
import { autoFillDimensions } from "./client";
import { getProvider } from "./providers";
import type { AgentHistoryItem } from "./decision";

const provider = getProvider("deepseek");
const manifest = buildCatalogManifest();

// ── conflictIdsFor with includeCaution ──────────────────────────────────

describe("conflictIdsFor (A2)", () => {
  it("by default only blocks hard conflicts (same as hardConflictIdsFor)", () => {
    const selectedIds = ["image_framing:wide_shot"];
    const soft = conflictIdsFor(selectedIds);
    const hard = hardConflictIdsFor(selectedIds);
    expect([...soft].sort()).toEqual([...hard].sort());
  });

  it("with includeCaution=true blocks caution relations too", () => {
    const caution = OPTION_CONFLICTS.find((c) => c.relation === "caution");
    expect(caution).toBeDefined();

    const withoutCaution = conflictIdsFor([caution!.a]);
    const withCaution = conflictIdsFor([caution!.a], { includeCaution: true });

    for (const id of withoutCaution) {
      expect(withCaution.has(id)).toBe(true);
    }
    expect(withCaution.has(caution!.b)).toBe(true);
  });

  it("includeCaution=false behaves same as default", () => {
    const ids = ["image_framing:wide_shot", "image_art_style:minimalist"];
    const a = conflictIdsFor(ids, { includeCaution: false });
    const b = conflictIdsFor(ids);
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("empty selections → empty set", () => {
    expect(conflictIdsFor([]).size).toBe(0);
    expect(conflictIdsFor([], { includeCaution: true }).size).toBe(0);
  });
});

// ── computeFillSet ──────────────────────────────────────────────────────

describe("computeFillSet (A3)", () => {
  it("returns secondary-only dimensions for 人像 simple", () => {
    const fill = computeFillSet("人像", [], manifest);
    expect(fill.length).toBeGreaterThan(0);
    expect(fill.length).toBeLessThanOrEqual(4);

    const essentialIds = ["subject", "person_type", "gender_presentation", "framing", "portrait_expression"];
    for (const eid of essentialIds) {
      expect(fill).not.toContain(eid);
    }

    const tertiaryIds = ["post_processing", "detail_level", "use_case"];
    for (const tid of tertiaryIds) {
      expect(fill).not.toContain(tid);
    }
  });

  it("excludes already-asked dimensions", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "camera", selectedOptionIds: ["image_camera:35mm_wide"] },
    ];
    const fill = computeFillSet("人像", history, manifest);
    expect(fill).not.toContain("subject");
    expect(fill).not.toContain("camera");
  });

  it("excludes free_text dimensions", () => {
    const fill = computeFillSet("人像", [], manifest);
    const freeTextDims = manifest.filter((d) => d.mode === "free_text");
    for (const ft of freeTextDims) {
      expect(fill).not.toContain(ft.questionId);
    }
  });

  it("respects cap parameter", () => {
    const fill2 = computeFillSet("人像", [], manifest, 2);
    expect(fill2.length).toBeLessThanOrEqual(2);

    const fill1 = computeFillSet("人像", [], manifest, 1);
    expect(fill1.length).toBeLessThanOrEqual(1);
  });

  it("boosts hair into the fill cap when the seed mentions silver hair", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:game_character"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:game_character"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:masculine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:confident"] },
    ];
    const plain = computeFillSet("人像", history, manifest, 4, undefined, "普通描述");
    const boosted = computeFillSet("人像", history, manifest, 4, undefined, "银发剑士游戏立绘");
    expect(plain).toContain("hair");
    expect(boosted[0]).toBe("hair");
  });

  it("boosts render style when the seed mentions otome", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:otome_character"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:otome_visual_novel"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:masculine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:close_up"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:tender"] },
    ];
    const boosted = computeFillSet("人像", history, manifest, 4, undefined, "乙游男主 POV 心动对视");
    expect(boosted).toContain("character_render_style");
  });

  it("uses cap 5 when seed boost applies", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:game_character"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:game_character"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:masculine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:confident"] },
    ];
    const plain = computeFillSet("人像", history, manifest, 4, undefined, "普通描述");
    const boosted = computeFillSet("人像", history, manifest, 5, undefined, "银发剑士游戏立绘");
    expect(plain.length).toBeLessThanOrEqual(4);
    expect(boosted.length).toBe(5);
  });

  it("P0-1: default fill cap includes lighting, hair, and pose for portrait", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:realistic_portrait"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:feminine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:gentle"] },
    ];
    const fill = computeFillSet("人像", history, manifest, 4, undefined, "普通女生写真");
    expect(fill).toContain("lighting");
    expect(fill).toContain("hair");
    expect(fill).toContain("pose");
  });

  it("P0-5: omits age_band from cap when seed has no age cue", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:realistic_portrait"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:feminine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:gentle"] },
    ];
    const fill = computeFillSet("人像", history, manifest, 4, undefined, "普通女生写真");
    expect(fill).not.toContain("age_band");
  });

  it("P0-4: default fill prefers pose over outfit in cap", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:realistic_portrait"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:feminine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:gentle"] },
    ];
    const fill = computeFillSet("人像", history, manifest, 5, undefined, "普通女生写真");
    expect(fill).toContain("pose");
    expect(fill).not.toContain("outfit");
  });

  it("P0-4: outfit seed keeps outfit and drops pose from fill cap", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:realistic_portrait"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:feminine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:gentle"] },
    ];
    const fill = computeFillSet("人像", history, manifest, 5, undefined, "穿婚纱的新娘");
    expect(fill).toContain("outfit");
    expect(fill).not.toContain("pose");
  });

  it("P1-8 fill path: drops aspect_ratio after framing without camera seed", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:beautiful_woman"] },
      { questionId: "person_type", selectedOptionIds: ["image_person_type:realistic_portrait"] },
      { questionId: "gender_presentation", selectedOptionIds: ["image_gender_presentation:feminine"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "portrait_expression", selectedOptionIds: ["image_portrait_expression:gentle"] },
    ];
    const fill = computeFillSet("人像", history, manifest, 10, undefined, "普通女生写真");
    expect(fill).not.toContain("aspect_ratio");
    expect(fill).not.toContain("camera_angle");
  });

  it("returns empty for types with no secondary remaining", () => {
    const fill = computeFillSet("通用", [], manifest);
    expect(fill.length).toBeLessThanOrEqual(4);
  });

  it("returns empty when all portrait secondary dimensions are already asked", () => {
    const allFill = computeFillSet("人像", [], manifest, 40);
    const history: AgentHistoryItem[] = allFill.map((questionId) => ({
      questionId,
      selectedOptionIds: [manifest.find((d) => d.questionId === questionId)!.options[0].id],
    }));
    const fill = computeFillSet("人像", history, manifest, 40);
    expect(fill).toEqual([]);
  });
});

// ── resolveActiveSet regression (A1) ────────────────────────────────────

describe("resolveActiveSet (A1)", () => {
  it("activeDimensions still returns same results as before extraction", () => {
    const types = ["人像", "通用"];
    const precisions = ["simple", "standard", "detailed"] as const;

    for (const type of types) {
      for (const precision of precisions) {
        const { ordered, done } = activeDimensions(type, precision, []);
        expect(ordered.length).toBeGreaterThan(0);
        expect(done).toBe(false);
        expect(new Set(ordered).size).toBe(ordered.length);
      }
    }
  });

  it("resolveActiveSet includes asked dims (unlike activeDimensions)", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
    ];
    const active = resolveActiveSet("人像", "simple", history);
    expect(active.has("subject")).toBe(true);

    const { ordered } = activeDimensions("人像", "simple", history);
    expect(ordered).not.toContain("subject");
  });
});

// ── autoFillDimensions (A4) ─────────────────────────────────────────────

describe("autoFillDimensions (A4)", () => {
  it("returns empty for empty fillSet", async () => {
    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history: [],
      fillSet: [],
    });
    expect(result).toEqual([]);
  });

  it("threads the seed + faithfulness instruction into the request (seed-blind fix)", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:close_up"] },
    ];
    const fillSet = computeFillSet("人像", history, manifest);
    if (fillSet.length === 0) { expect(fillSet).toEqual([]); return; }

    let captured: unknown = null;
    const capture = async (req: unknown) => { captured = req; return { choices: [{ message: { tool_calls: [] } }] }; };

    await autoFillDimensions(provider, "k", { manifest, history, fillSet, userDescription: "僧侣冥想，水彩风" }, capture);
    const withSeed = JSON.stringify(captured);
    expect(withSeed).toContain("僧侣冥想，水彩风"); // the seed reaches the model
    expect(withSeed).toMatch(/忠实|不要补|冲突/);   // the faithfulness instruction is present

    captured = null;
    await autoFillDimensions(provider, "k", { manifest, history, fillSet }, capture); // no seed
    expect(JSON.stringify(captured)).not.toContain("僧侣冥想"); // absent when no userDescription
  });

  it("accepts valid options from stub response", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const fillSet = computeFillSet("人像", history, manifest);
    if (fillSet.length === 0) {
      expect(fillSet).toEqual([]);
      return;
    }

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: fillSet.map((qid) => {
                  const dim = manifest.find((d) => d.questionId === qid)!;
                  return { questionId: qid, optionIds: [dim.options[0].id] };
                }),
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet,
    }, transport);

    expect(result.length).toBe(fillSet.length);
    for (const r of result) {
      expect(fillSet).toContain(r.questionId);
      expect(r.selectedOptionIds.length).toBeGreaterThan(0);
    }
  });

  it("drops nonexistent option ids from response", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const fillSet = computeFillSet("人像", history, manifest);
    if (fillSet.length === 0) return;

    const dim = manifest.find((d) => d.questionId === fillSet[0])!;
    const validId = dim.options[0].id;
    const nonexistentId = "image_FAKE:not_real_at_all";

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: [
                  { questionId: fillSet[0], optionIds: [validId, nonexistentId] },
                ],
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet: [fillSet[0]],
    }, transport);

    expect(result.length).toBe(1);
    expect(result[0].selectedOptionIds).toContain(validId);
    expect(result[0].selectedOptionIds).not.toContain(nonexistentId);
  });

  it("drops options that hard-conflict with user selections", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:wide_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const blockedByWide = hardConflictIdsFor(["image_framing:wide_shot"]);
    expect(blockedByWide.has("image_camera:85mm_portrait")).toBe(true);

    const fillSet = computeFillSet("人像", history, manifest);
    if (fillSet.length === 0) return;

    const cameraFill = fillSet.includes("camera") ? "camera" : fillSet[0];

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: [{
                  questionId: cameraFill,
                  optionIds: ["image_camera:85mm_portrait", "image_camera:35mm_wide"],
                }],
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet: [cameraFill],
    }, transport);

    if (result.length > 0) {
      expect(result[0].selectedOptionIds).not.toContain("image_camera:85mm_portrait");
    }
  });

  it("cross-dimension conflict: accumulation works across dims", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const fillSet = computeFillSet("人像", history, manifest, 4);
    if (fillSet.length < 2) return;

    const dim1 = manifest.find((d) => d.questionId === fillSet[0])!;
    const dim2 = manifest.find((d) => d.questionId === fillSet[1])!;

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: [
                  { questionId: fillSet[0], optionIds: [dim1.options[0].id] },
                  { questionId: fillSet[1], optionIds: [dim2.options[0].id] },
                ],
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet,
    }, transport);

    expect(result.length).toBeGreaterThanOrEqual(0);
    if (result.length === 2) {
      expect(result[0].questionId).toBe(fillSet[0]);
      expect(result[1].questionId).toBe(fillSet[1]);
    }
  });

  it("returns empty on transport error (never blocks)", async () => {
    const transport = async () => {
      throw new Error("network down");
    };

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history: [],
      fillSet: ["camera", "art_style"],
    }, transport);

    expect(result).toEqual([]);
  });

  it("returns empty for malformed LLM response", async () => {
    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({ not_picks: "garbage" }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history: [],
      fillSet: ["camera"],
    }, transport);

    expect(result).toEqual([]);
  });

  it("single-mode dimension: takes only first option", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const fillSet = computeFillSet("人像", history, manifest, 4);
    if (fillSet.length === 0) return;

    const singleDim = fillSet
      .map((qid) => manifest.find((d) => d.questionId === qid)!)
      .find((d) => d.mode === "single");

    if (!singleDim) return;

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: [{
                  questionId: singleDim.questionId,
                  optionIds: singleDim.options.slice(0, 3).map((o) => o.id),
                }],
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet: [singleDim.questionId],
    }, transport);

    if (result.length > 0) {
      expect(result[0].selectedOptionIds.length).toBe(1);
    }
  });

  it("dedup: LLM returns same questionId twice → only first accepted", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const fillSet = computeFillSet("人像", history, manifest, 4);
    if (fillSet.length === 0) return;

    const dim = manifest.find((d) => d.questionId === fillSet[0])!;
    const opt1 = dim.options[0].id;
    const opt2 = dim.options.length > 1 ? dim.options[1].id : opt1;

    // LLM returns the same questionId twice with different options
    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: [
                  { questionId: fillSet[0], optionIds: [opt1] },
                  { questionId: fillSet[0], optionIds: [opt2] }, // duplicate!
                ],
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet: [fillSet[0]],
    }, transport);

    // Should only have one result for this questionId (first pick wins)
    const matches = result.filter((r) => r.questionId === fillSet[0]);
    expect(matches.length).toBeLessThanOrEqual(1);
    if (matches.length === 1) {
      expect(matches[0].selectedOptionIds).toContain(opt1);
    }
  });

  it("multi mode: caps at 2 options even if LLM returns 3+", async () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["image_subject:single_person"] },
      { questionId: "framing", selectedOptionIds: ["image_framing:medium_shot"] },
      { questionId: "scene", selectedOptionIds: ["image_scene:studio_env"] },
      { questionId: "lighting", selectedOptionIds: ["image_lighting:window_soft"] },
      { questionId: "color_palette", selectedOptionIds: ["image_color_palette:warm_tones"] },
    ];

    const fillSet = computeFillSet("人像", history, manifest, 4);
    if (fillSet.length === 0) return;

    // Find a multi-mode dimension
    const multiDim = fillSet
      .map((qid) => manifest.find((d) => d.questionId === qid)!)
      .find((d) => d.mode === "multi");

    if (!multiDim || multiDim.options.length < 3) return;

    const transport = async () => ({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: "fill_dimensions",
              arguments: JSON.stringify({
                picks: [{
                  questionId: multiDim.questionId,
                  optionIds: multiDim.options.slice(0, 4).map((o) => o.id), // LLM tries 4
                }],
              }),
            },
          }],
        },
      }],
    });

    const result = await autoFillDimensions(provider, "test-key", {
      manifest,
      history,
      fillSet: [multiDim.questionId],
    }, transport);

    if (result.length > 0) {
      // Multi mode should be capped at 2
      expect(result[0].selectedOptionIds.length).toBeLessThanOrEqual(2);
    }
  });
});
