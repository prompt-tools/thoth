import type { LocalizedText, PromptBrief } from "../types";

/** Generic template-driven prompt assembly (D-03). */
export function assemblePrompt(
  brief: PromptBrief,
  templateMap: Record<string, LocalizedText>,
  locale: "zh" | "en"
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const item of brief.items) {
    const tpl = templateMap[item.questionId];
    if (!tpl) continue;
    const optionSeparator = locale === "zh" ? "，" : ", ";
    const text =
      item.freeText ??
      item.selectedOptions.map((o) => o.promptFragment[locale]).join(optionSeparator);
    if (!text) continue;
    result[item.questionId] = tpl[locale].replace("{选项}", text);
  }
  return result;
}
