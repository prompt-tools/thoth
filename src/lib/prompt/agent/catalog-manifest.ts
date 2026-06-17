import { IMAGE_TARGET_ID } from "../types";
import { getOptionsForTarget, tryGetOptionSet } from "../registry";
import { GRADIENT } from "./gradient";
import { imagePromptAgentWorkType } from "../work-types/image-prompt-agent.worktype";

const PORTRAIT_SUBJECT_CATEGORY_IDS = ["cat:image_subject:people"];
const PORTRAIT_USE_CASE_IDS = new Set([
  "image_use_case:poster",
  "image_use_case:cover_image",
  "image_use_case:avatar",
  "image_use_case:wallpaper",
  "image_use_case:illustration",
  "image_use_case:banner",
  "image_use_case:social_media_post",
  "image_use_case:thumbnail",
  "image_use_case:greeting_card",
  "image_use_case:presentation_image",
  "image_use_case:article_hero",
  "image_use_case:invitation",
  "image_use_case:print_material",
]);
const BLOCKED_ART_STYLE_IDS = new Set([
  "image_art_style:product_photography",
  "image_art_style:food_photography",
  "image_art_style:architectural_photography",
  "image_art_style:macro_photography",
  "image_art_style:aerial_photography",
]);

function buildPortraitQuestionIdSet(): Set<string> {
  const ids = new Set<string>();
  for (const tier of [GRADIENT.shared.essential, GRADIENT.shared.tertiary]) {
    for (const item of tier) ids.add(item.questionId);
  }
  for (const primaryType of GRADIENT.primaryTypes) {
    for (const tier of [primaryType.essential, primaryType.secondary, primaryType.tertiary]) {
      for (const item of tier) ids.add(item.questionId);
    }
    for (const questionId of primaryType.order) ids.add(questionId);
    for (const entry of primaryType.conditional) {
      ids.add(entry.questionId);
      ids.add(entry.condition.dimension);
    }
  }
  return ids;
}

const PORTRAIT_QUESTION_IDS = buildPortraitQuestionIdSet();

/**
 * The public product is portrait-only. Always return the people category so
 * fallback paths and empty descriptions never leak product/animal/food subjects.
 */
export function getTypeFilteredSubjectOptionIds(type: string): Set<string> | null {
  void type;
  const set = tryGetOptionSet("image_subject");
  if (!set?.categories) return null;
  const allowed = new Set<string>();
  for (const cat of set.categories) {
    if (PORTRAIT_SUBJECT_CATEGORY_IDS.includes(cat.id)) {
      for (const id of cat.optionIds) allowed.add(id);
    }
  }
  return allowed.size > 0 ? allowed : null;
}

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

/** Serialize the portrait-only catalog into a lean, zh-only structure for
 *  the LLM. Reuses the agent worktype as the dimension source and the
 *  option registry for each set's options — so the agent can never reference a
 *  dimension or option that the deterministic renderer can't resolve.
 *
 *  Kept small (no fragments / professionalTerms) so it can be cached across
 *  turns via prompt caching. */
export function buildCatalogManifest(): CatalogManifest {
  const dimensions: CatalogManifest = [];
  for (const question of imagePromptAgentWorkType.questions) {
    if (!question.optionSetId) continue;
    if (!PORTRAIT_QUESTION_IDS.has(question.id)) continue;
    const rawOptions = getOptionsForTarget(question.optionSetId, IMAGE_TARGET_ID).filter((option) => {
      if (question.id === "use_case") return PORTRAIT_USE_CASE_IDS.has(option.id);
      if (question.id === "art_style") return !BLOCKED_ART_STYLE_IDS.has(option.id);
      return true;
    });
    const options = rawOptions.map(
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
