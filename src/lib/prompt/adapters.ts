import { buildPromptBrief } from "./brief";
import { evaluatePromptQuality } from "./heuristics";
import { resolveAdapter, resolveTarget } from "./registry";
import type {
  LocalizedText,
  NegativePromptTier,
  PromptSelections,
  RenderedPrompt,
  WorkTypeConfig
} from "./types";
import { IMAGE_TARGET_ID } from "./types";

// I-02: adapter is resolved lazily via registry/adapter.registry.ts (which
// imports the singleton `genericImageAdapter` directly). No runtime
// registration step required.
//
// Callers of renderPrompt() must still import "@/lib/prompt/init" first to
// trigger two real module-load side effects:
//   1. options/* register their option sets via registerOptionSet (kept per
//      I-07 because cross-set queries earn the option registry abstraction)
//   2. work-types/image-prompt.worktype runs assertValidWorkTypeConfig
//      against the now-populated optionSetMap
//
// All real consumers (layout.tsx, prompt-guide/index.tsx, test/setup.ts)
// already import init.

export function renderPrompt(params: {
  workType: WorkTypeConfig;
  rawIntent: string;
  selections: PromptSelections;
  negPromptTier?: NegativePromptTier;
  /** Optional per-question free-text overrides (agent prototype escape hatch). */
  freeTexts?: Record<string, string>;
}): RenderedPrompt {
  const target = resolveTarget(IMAGE_TARGET_ID);
  const adapter = resolveAdapter();
  const brief = buildPromptBrief({
    workType: params.workType,
    targetToolId: IMAGE_TARGET_ID,
    rawIntent: params.rawIntent,
    selections: params.selections,
    freeTexts: params.freeTexts
  });

  let rendered = adapter.render(brief, params.negPromptTier);

  const constraintsItem = brief.items.find(
    (item) => item.questionId === "constraints"
  );
  if (constraintsItem && target.safetyDefaults.length > 0) {
    const selectedIds = new Set(
      constraintsItem.selectedOptions.map((opt) => opt.id)
    );
    const missing = target.safetyDefaults.filter((id) => !selectedIds.has(id));
    if (missing.length > 0) {
      const warning: LocalizedText = {
        zh: `已取消预选的安全约束：${missing.join("、")}。这可能影响生成结果的安全合规性。`,
        en: `Safety defaults deselected: ${missing.join(", ")}. This may affect output safety compliance.`
      };
      rendered = { ...rendered, warnings: [...rendered.warnings, warning] };
    }
  }

  const heuristicWarnings = evaluatePromptQuality(
    params.selections,
    params.rawIntent,
    params.workType.id,
  );
  if (heuristicWarnings.length > 0) {
    rendered = { ...rendered, warnings: [...rendered.warnings, ...heuristicWarnings] };
  }

  if (brief.suppressWarnings && brief.suppressWarnings.length > 0) {
    rendered = { ...rendered, warnings: [...rendered.warnings, ...brief.suppressWarnings] };
  }

  return rendered;
}
