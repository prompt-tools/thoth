import { genericImageTarget } from "../targets/generic-image.target";
import { assemblePrompt, getBriefText, warningFromBrief } from "../brief";
import { GRADIENT, type GradientData } from "../agent/gradient";
import type {
  BriefItem,
  NegativePromptTier,
  PromptBrief,
  RenderedPrompt,
  TargetAdapter,
  TemplateTargetConfig
} from "../types";

export function buildSubjectScopedIndex(gradient: GradientData): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const primaryType of gradient.primaryTypes) {
    for (const tier of [primaryType.essential, primaryType.secondary, primaryType.tertiary]) {
      for (const item of tier) {
        if (!item.scopeToOption?.length) continue;
        const ids = index.get(item.questionId) ?? new Set<string>();
        for (const id of item.scopeToOption) ids.add(id);
        index.set(item.questionId, ids);
      }
    }
  }
  return index;
}

const DEFAULT_SCOPED_INDEX = buildSubjectScopedIndex(GRADIENT);

/** Corpus-aligned order for scoped dims folded into the subject phrase (P2-10). */
const SCOPED_DIM_ORDER = [
  "person_type",
  "gender_presentation",
  "age_band",
  "skin_tone",
  "portrait_expression",
  "face_features",
  "makeup",
  "hair",
  "outfit",
  "pose",
  "body_type",
  "character_render_style",
  "character_archetype",
  "character_interaction",
  "character_props",
] as const;

/** templateMap keys after subject assembly — scene/lighting before style/camera/quality. */
const TEMPLATE_RENDER_ORDER = [
  "scene",
  "lighting",
  "framing",
  "camera",
  "camera_angle",
  "aspect_ratio",
  "art_style",
  "color_palette",
  "mood",
  "composition",
  "detail_level",
  "post_processing",
  "time_season",
  "use_case",
  "perspective",
  "constraints",
] as const;

function identifyScopedDims(
  brief: PromptBrief,
  tpl: TemplateTargetConfig["templateMap"],
  scopedIndex: Map<string, Set<string>>
): Set<string> {
  const scoped = new Set<string>();
  const subjectItem = brief.items.find((item) => item.questionId === "subject");
  if (!subjectItem) return scoped;
  if (subjectItem.freeText) {
    for (const item of brief.items) {
      if (!tpl[item.questionId] && scopedIndex.has(item.questionId)) scoped.add(item.questionId);
    }
    return scoped;
  }
  const selectedSubjectIds = new Set(subjectItem.selectedOptions.map((o) => o.id));
  for (const item of brief.items) {
    if (tpl[item.questionId]) continue;
    const activators = scopedIndex.get(item.questionId);
    if (!activators) continue;
    for (const id of activators) {
      if (selectedSubjectIds.has(id)) {
        scoped.add(item.questionId);
        break;
      }
    }
  }
  return scoped;
}

function optionText(item: BriefItem, locale: "zh" | "en"): string {
  const sep = locale === "zh" ? "，" : ", ";
  return (
    item.freeText ??
    item.selectedOptions.map((o) => o.promptFragment[locale]).join(sep)
  );
}

function assembleSubjectPhrase(
  brief: PromptBrief,
  subjectPart: string,
  scopedDims: Set<string>,
  locale: "zh" | "en"
): string {
  const sep = locale === "zh" ? "，" : ", ";
  const fragments = [subjectPart];
  const itemsById = new Map(brief.items.map((item) => [item.questionId, item]));
  const orderedIds: string[] = [];
  for (const qid of SCOPED_DIM_ORDER) {
    if (scopedDims.has(qid)) orderedIds.push(qid);
  }
  for (const qid of scopedDims) {
    if (!orderedIds.includes(qid)) orderedIds.push(qid);
  }
  for (const qid of orderedIds) {
    const item = itemsById.get(qid);
    if (!item) continue;
    const text = optionText(item, locale);
    if (text) fragments.push(text);
  }
  return fragments.join(sep);
}

function render(
  brief: PromptBrief,
  negPromptTier?: NegativePromptTier,
  scopedIndex: Map<string, Set<string>> = DEFAULT_SCOPED_INDEX
): RenderedPrompt {
  const tpl = genericImageTarget.templateMap;
  const parts = assemblePrompt(brief, tpl, "zh");
  const partsEn = assemblePrompt(brief, tpl, "en");

  const scopedDims = identifyScopedDims(brief, tpl, scopedIndex);
  const useAssembly = scopedDims.size > 0 && !!parts.subject;

  const zhPhrases: string[] = [];
  const enPhrases: string[] = [];

  if (useAssembly) {
    if (parts.subject) zhPhrases.push(assembleSubjectPhrase(brief, parts.subject, scopedDims, "zh"));
    if (partsEn.subject) enPhrases.push(assembleSubjectPhrase(brief, partsEn.subject, scopedDims, "en"));
  }

  for (const key of TEMPLATE_RENDER_ORDER) {
    if (!(key in tpl)) continue;
    const zhPart = parts[key];
    const enPart = partsEn[key];
    if (zhPart) zhPhrases.push(zhPart);
    if (enPart) enPhrases.push(enPart);
  }

  for (const key of Object.keys(tpl)) {
    if ((TEMPLATE_RENDER_ORDER as readonly string[]).includes(key)) continue;
    if (key === "subject" && useAssembly) continue;
    const zhPart = parts[key];
    const enPart = partsEn[key];
    if (zhPart) zhPhrases.push(zhPart);
    if (enPart) enPhrases.push(enPart);
  }

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

  const zhIntent = brief.rawIntent || getBriefText(brief, "use_case", "zh");
  const enIntent = brief.rawIntent || getBriefText(brief, "use_case", "en");

  const negConfig = genericImageTarget.negativePrompt;
  if (negConfig) {
    const tier = negPromptTier || negConfig.default;
    const negZh = negConfig.texts[tier].zh;
    const negEn = negConfig.texts[tier].en;
    if (negZh) zhKept.push(negZh);
    if (negEn) enKept.push(negEn);
  }

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

export const renderGenericImage = render;

export const genericImageAdapter: TargetAdapter<TemplateTargetConfig> = {
  target: genericImageTarget,
  render
};
