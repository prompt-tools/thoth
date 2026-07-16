import { buildPromptBrief } from "./brief";
import { evaluatePromptQuality } from "./heuristics";
import { getOptionById, resolveAdapter, resolveTarget } from "./registry";
import type {
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

/** Portrait safety/quality negatives — always appended; not user-selectable. */
function appendAutomaticConstraints(
  rendered: RenderedPrompt,
  constraintIds: readonly string[],
): RenderedPrompt {
  const zhExtra: string[] = [];
  const enExtra: string[] = [];
  for (const id of constraintIds) {
    const opt = getOptionById(id);
    if (!opt) continue;
    const zh = opt.promptFragment.zh.trim();
    const en = opt.promptFragment.en.trim();
    if (zh && !rendered.zhPrompt.includes(zh)) zhExtra.push(zh);
    if (en && !rendered.enPrompt.includes(en)) enExtra.push(en);
  }
  if (zhExtra.length === 0 && enExtra.length === 0) return rendered;
  return {
    ...rendered,
    zhPrompt: zhExtra.length > 0 ? `${rendered.zhPrompt}，${zhExtra.join("，")}` : rendered.zhPrompt,
    enPrompt: enExtra.length > 0 ? `${rendered.enPrompt}, ${enExtra.join(", ")}` : rendered.enPrompt,
  };
}

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
  const constraintQuestion = params.workType.questions.find((question) => question.id === "constraints");
  const selectedConstraints = (Array.isArray(params.selections.constraints)
    ? params.selections.constraints
    : params.selections.constraints ? [params.selections.constraints] : [])
    .slice(0, constraintQuestion?.maxSelections);
  // Constraints share one rendering path so user choices and required defaults dedupe.
  const { constraints: _omit, ...selectionsWithoutConstraints } = params.selections;
  void _omit;

  const brief = buildPromptBrief({
    workType: params.workType,
    targetToolId: IMAGE_TARGET_ID,
    rawIntent: params.rawIntent,
    selections: selectionsWithoutConstraints,
    freeTexts: params.freeTexts
  });

  let rendered = adapter.render(brief, params.negPromptTier);
  const constraintIds = [...new Set([...selectedConstraints, ...target.safetyDefaults])];
  if (constraintIds.length > 0) {
    rendered = appendAutomaticConstraints(rendered, constraintIds);
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
