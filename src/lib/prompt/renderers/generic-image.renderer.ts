import { genericImageTarget } from "../targets/generic-image.target";
import { assemblePrompt, getBriefText, warningFromBrief } from "../brief";
import type { NegativePromptTier, PromptBrief, RenderedPrompt, TargetAdapter, TemplateTargetConfig } from "../types";

function render(brief: PromptBrief, negPromptTier?: NegativePromptTier): RenderedPrompt {
  const tpl = genericImageTarget.templateMap;
  const parts = assemblePrompt(brief, tpl, "zh");
  const partsEn = assemblePrompt(brief, tpl, "en");

  // Collect non-empty parts and join with locale-appropriate separator.
  // Chinese: full-width comma "，"  /  English: comma + space ", "
  // Filter out undefined/empty values so no dangling separators.

  const zhPhrases: string[] = [];
  const enPhrases: string[] = [];

  // Iterate templateMap keys to maintain consistent order
  // between zh and en output (templateMap keys define the dimension order)
  for (const key of Object.keys(tpl)) {
    const zhPart = parts[key];
    const enPart = partsEn[key];
    if (zhPart) zhPhrases.push(zhPart);
    if (enPart) enPhrases.push(enPart);
  }

  // Dedupe repeated fragments ACROSS dimensions (e.g. "浅景深" emitted by camera +
  // framing + aperture). The judge penalised this redundancy and it hurt the wizard
  // vs the bare seed (docs/research/autofill-seed-blind-2026-06-03.md). Split each
  // dimension phrase into its comma-joined fragments, keep first occurrence, re-join.
  const dedupeFragments = (phrases: string[], sep: string): string[] => {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const phrase of phrases) {
      const survivors = phrase.split(sep).filter((frag) => {
        const key = frag.trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (survivors.length) kept.push(survivors.join(sep));
    }
    return kept;
  };
  const zhKept = dedupeFragments(zhPhrases, "，");
  const enKept = dedupeFragments(enPhrases, ", ");

  // Prepend intent from rawIntent or use_case as a leading phrase
  const zhIntent = brief.rawIntent || getBriefText(brief, "use_case", "zh");
  const enIntent = brief.rawIntent || getBriefText(brief, "use_case", "en");

  // Inject negative prompt (default tier: medium) AFTER dedupe so its internal list
  // is never split/merged with dimension fragments.
  const negConfig = genericImageTarget.negativePrompt;
  if (negConfig) {
    const tier = negPromptTier || negConfig.default;
    const negZh = negConfig.texts[tier].zh;
    const negEn = negConfig.texts[tier].en;
    if (negZh) zhKept.push(negZh);
    if (negEn) enKept.push(negEn);
  }

  // Build final prompts: intent (if available) followed by comma-separated dimension phrases
  const zhPrompt = (zhIntent ? zhIntent + "，" : "") + zhKept.join("，");
  const enPrompt = (enIntent ? enIntent + ", " : "") + enKept.join(", ");

  return {
    version: "0.1.0",
    targetToolId: genericImageTarget.id,
    zhPrompt,
    enPrompt,
    brief,
    adaptationNote: genericImageTarget.adaptationNote,
    warnings: warningFromBrief(brief)
  };
}

// I-02: self-registration removed. The adapter is resolved as a singleton
// from registry/adapter.registry.ts (which imports `genericImageAdapter`
// directly). This avoids a side-effect import dependency and lets us delete
// the Map-based adapter registry without losing any behavior.
export const genericImageAdapter: TargetAdapter<TemplateTargetConfig> = {
  target: genericImageTarget,
  render
};
