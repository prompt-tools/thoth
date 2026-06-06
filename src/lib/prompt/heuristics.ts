import type { HeuristicRule, LocalizedText, PromptSelections, WorkTypeId } from "./types";
import { imageHeuristics } from "./work-types/image-prompt.heuristics";

const workTypeHeuristics: Record<WorkTypeId, readonly HeuristicRule[]> = {
  image_prompt: imageHeuristics,
};

export function evaluatePromptQuality(
  selections: PromptSelections,
  rawIntent: string = "",
  workTypeId: WorkTypeId = "image_prompt",
): LocalizedText[] {
  const warnings: LocalizedText[] = [];
  const input = { selections, rawIntent };
  for (const rule of workTypeHeuristics[workTypeId]) {
    const w = rule.evaluate(input);
    if (w !== null) warnings.push(w);
  }
  return warnings;
}
