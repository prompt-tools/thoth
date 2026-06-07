import { IMAGE_TARGET_ID } from "../types";
import { getOptionsForTarget, tryGetOptionSet } from "../registry";

/** Maps primary type → allowed subject category ids (from imageSubjectOptions.categories). */
const TYPE_TO_SUBJECT_CATEGORIES: Record<string, string[]> = {
  "人像":     ["cat:image_subject:people"],
  "产品/静物": ["cat:image_subject:product"],
  "动物":     ["cat:image_subject:animal"],
  "场景/氛围": ["cat:image_subject:nature", "cat:image_subject:architecture"],
  "食物/饮品": ["cat:image_subject:food"],
};

/**
 * Return the option ids from image_subject that belong to the given primary type's
 * categories. Returns null when the type is "通用" or the option set has no categories.
 * Used by buildTurnRequest to pre-filter what the model sees on the subject question.
 */
export function getTypeFilteredSubjectOptionIds(type: string): Set<string> | null {
  const categoryIds = TYPE_TO_SUBJECT_CATEGORIES[type];
  if (!categoryIds) return null;
  const set = tryGetOptionSet("image_subject");
  if (!set?.categories) return null;
  const allowed = new Set<string>();
  for (const cat of set.categories) {
    if (categoryIds.includes(cat.id)) {
      for (const id of cat.optionIds) allowed.add(id);
    }
  }
  return allowed.size > 0 ? allowed : null;
}
import { imagePromptAgentWorkType } from "../work-types/image-prompt-agent.worktype";

/** One option as the agent sees it — id + human labels, no prompt fragments.
 *  The fragments stay server-side in the catalog and are stitched
 *  deterministically; the agent only needs enough to choose relevant ids. */
export interface CatalogOption {
  id: string;
  label: string;
  plain: string;
}

/** One dimension (question) the agent can choose to ask next. */
export interface CatalogDimension {
  questionId: string;
  title: string;
  helper: string;
  mode: "single" | "multi" | "free_text";
  options: CatalogOption[];
}

export type CatalogManifest = CatalogDimension[];

/** Serialize the full 14-dimension catalog into a lean, zh-only structure for
 *  the LLM. Reuses the canonical worktype as the dimension source and the
 *  option registry for each set's options — so the agent can never reference a
 *  dimension or option that the deterministic renderer can't resolve.
 *
 *  Kept small (no fragments / professionalTerms) so it can be cached across
 *  turns via prompt caching. */
export function buildCatalogManifest(): CatalogManifest {
  const dimensions: CatalogManifest = [];
  for (const question of imagePromptAgentWorkType.questions) {
    if (!question.optionSetId) continue;
    const options = getOptionsForTarget(question.optionSetId, IMAGE_TARGET_ID).map(
      (option): CatalogOption => ({
        id: option.id,
        label: option.label.zh,
        plain: option.plain.zh,
      })
    );
    if (options.length === 0) continue;
    dimensions.push({
      questionId: question.id,
      title: question.title.zh,
      helper: question.helper.zh,
      mode: question.mode,
      options,
    });
  }
  return dimensions;
}
