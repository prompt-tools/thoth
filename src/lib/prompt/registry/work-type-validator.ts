import type { WorkTypeConfig } from "../types";
import { optionSetMap } from "./state";

/**
 * I-01: Standalone validator for WorkTypeConfig. Lives in its own file (not
 * work-type.registry.ts) to avoid a circular import — the registry imports
 * the singleton from work-types/image-prompt.worktype.ts, which in turn must
 * import the validator. Splitting validator and resolver into different files
 * breaks that cycle.
 *
 * Called once at module load from image-prompt.worktype.ts.
 */
export function assertValidWorkTypeConfig(config: WorkTypeConfig): void {
  const questionIds = new Set<string>();
  const optionSetIdsInRegistry = new Set(optionSetMap.keys());
  for (const question of config.questions) {
    if (questionIds.has(question.id)) {
      throw new Error(
        `Duplicate question ID "${question.id}" in work type "${config.id}"`,
      );
    }
    questionIds.add(question.id);
    if (question.optionSetId && !optionSetIdsInRegistry.has(question.optionSetId)) {
      throw new Error(
        `Question "${question.id}" in work type "${config.id}" references unknown optionSet: ${question.optionSetId}`,
      );
    }
    if (
      question.mode === "multi" &&
      question.minSelections &&
      question.maxSelections &&
      question.minSelections > question.maxSelections
    ) {
      throw new Error(
        `${question.id}: minSelections is greater than maxSelections`,
      );
    }
  }
}
