import type { PromptBrief } from "../types";

export function getBriefText(brief: PromptBrief, questionId: string, locale: "zh" | "en") {
  const item = brief.items.find((briefItem) => briefItem.questionId === questionId);
  if (!item) {
    return "";
  }
  if (item.freeText) {
    return item.freeText;
  }
  return item.selectedOptions
    .map((option) => option.promptFragment[locale])
    .join(locale === "zh" ? "；" : "; ");
}
