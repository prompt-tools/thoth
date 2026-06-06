import { getOptionById } from "../registry";
import type {
  BriefItem,
  PromptBrief,
  PromptSelections,
  TargetToolId,
  WorkTypeConfig
} from "../types";
import { applySuppresses } from "./suppress";
import { normalizeSelection } from "./normalize";

export function buildPromptBrief(params: {
  version?: string;
  workType: WorkTypeConfig;
  targetToolId: TargetToolId;
  rawIntent: string;
  selections: PromptSelections;
  /** Optional per-question free-text override (agent prototype escape hatch).
   *  When present for a question, it replaces that question's option picks.
   *  The main app omits this, so behavior there is unchanged. */
  freeTexts?: Record<string, string>;
}): PromptBrief {
  const items: BriefItem[] = params.workType.questions
    .map((question): BriefItem | undefined => {
      const override = params.freeTexts?.[question.id]?.trim();
      if (override) {
        return {
          questionId: question.id,
          title: question.title,
          selectedOptions: [],
          freeText: override
        };
      }

      const value = params.selections[question.id];
      if (question.mode === "free_text") {
        const freeText = typeof value === "string" ? value.trim() : "";
        if (!freeText) {
          return undefined;
        }
        return {
          questionId: question.id,
          title: question.title,
          selectedOptions: [],
          freeText
        };
      }

      let selectedOptions = normalizeSelection(value)
        .map((optionId) => getOptionById(optionId))
        .filter((option): option is NonNullable<typeof option> => Boolean(option));

      if (question.maxSelections && selectedOptions.length > question.maxSelections) {
        selectedOptions = selectedOptions.slice(0, question.maxSelections);
      }

      if (selectedOptions.length === 0) {
        return undefined;
      }

      return {
        questionId: question.id,
        title: question.title,
        selectedOptions
      };
    })
    .filter((item): item is BriefItem => Boolean(item));

  const { visible: visibleItems, warnings: suppressWarnings } = applySuppresses(items);

  return {
    version: params.version ?? "0.1.0",
    workTypeId: params.workType.id,
    targetToolId: params.targetToolId,
    rawIntent: params.rawIntent,
    items: visibleItems,
    suppressWarnings: suppressWarnings.length > 0 ? suppressWarnings : undefined
  };
}
