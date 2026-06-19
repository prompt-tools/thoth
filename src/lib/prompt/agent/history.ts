import type { PromptSelections, SelectionValue } from "../types";
import type { AgentHistoryItem } from "./decision";
import type { CatalogDimension, CatalogManifest } from "./catalog-manifest";
import { inferSubjectOptionIds } from "./routing";

/** When subject was skipped or free-text-only, attach inferred option ids for render. */
export function withInferredSubject(
  history: AgentHistoryItem[],
  userDescription: string,
  type = "人像",
): AgentHistoryItem[] {
  const entry = history.find((h) => h.questionId === "subject");
  if (!entry || entry.selectedOptionIds.length > 0) return history;
  const inferred = inferSubjectOptionIds(userDescription, type);
  if (inferred.length === 0) return history;
  return history.map((h) =>
    h.questionId === "subject" ? { ...h, selectedOptionIds: inferred } : h,
  );
}

/** Derive the PromptSelections-compatible value for a set of picked option ids.
 *  Returns undefined when no options are picked (e.g. skip or free-text-only). */
export function selectionValueFor(
  mode: CatalogDimension["mode"],
  selectedOptionIds: string[],
): SelectionValue | undefined {
  if (selectedOptionIds.length === 0) return undefined;
  if (mode === "single") return selectedOptionIds[0];
  return selectedOptionIds;
}

/** Immutable append-or-replace: drops any existing entry for the same
 *  questionId and appends the new one. */
export function appendAnswer(
  history: AgentHistoryItem[],
  questionId: string,
  selectedOptionIds: string[],
  freeText?: string,
): AgentHistoryItem[] {
  return [
    ...history.filter((h) => h.questionId !== questionId),
    {
      questionId,
      selectedOptionIds,
      freeText: freeText || undefined,
    },
  ];
}

/** Reconstruct PromptSelections + freeTexts from history — the same mapping
 *  that submitStep performs incrementally, but done in one shot. Useful for
 *  headless harnesses that need to reproduce renderPrompt inputs. */
export function buildRenderInputs(
  history: AgentHistoryItem[],
  manifest: CatalogManifest,
): { selections: PromptSelections; freeTexts: Record<string, string> } {
  const selections: PromptSelections = {};
  const freeTexts: Record<string, string> = {};

  for (const item of history) {
    if (item.freeText?.trim()) {
      freeTexts[item.questionId] = item.freeText;
      continue;
    }
    const dim = manifest.find((d) => d.questionId === item.questionId);
    if (!dim) continue;
    const v = selectionValueFor(dim.mode, item.selectedOptionIds);
    if (v !== undefined) {
      selections[item.questionId] = v;
    }
  }

  return { selections, freeTexts };
}
