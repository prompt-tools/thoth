import type { LocalizedText, PromptBrief } from "../types";

export function warningFromBrief(brief: PromptBrief): LocalizedText[] {
  return brief.items.flatMap((item) =>
    item.selectedOptions.flatMap((option) =>
      option.riskHint ? [option.riskHint] : []
    )
  );
}
