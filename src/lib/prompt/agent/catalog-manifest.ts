import { IMAGE_TARGET_ID } from "../types";
import { getOptionsForTarget } from "../registry";
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
