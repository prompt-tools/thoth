/**
 * fill.ts — compute the "fill set" for LLM auto-completion of secondary
 * dimensions that the interactive flow skipped (simple/standard precision).
 *
 * A3 in the Phase 2 plan.
 */
import {
  GRADIENT,
} from "./gradient";
import { resolveActiveSet, applyCameraQuestionDemotion } from "./active-dimensions";
import type { AgentHistoryItem } from "./decision";
import type { CatalogManifest } from "./catalog-manifest";
import { conflictIdsFor, suggestedIdsFor } from "./audit-model";
import {
  applyPortraitFillPolicy,
  boostFillCandidates,
  fillBoostSignals,
  PORTRAIT_CORE_FILL,
} from "./fill-boost";

export type HeuristicFillResult = {
  questionId: string;
  selectedOptionIds: string[];
};

/**
 * Deterministic autofill when the LLM returns nothing or skips §7 core dims.
 * Picks non-conflicting catalog options; prefers associations, then seed label match.
 */
export function heuristicFillGaps(
  fillSet: string[],
  missingQuestionIds: readonly string[],
  manifest: CatalogManifest,
  history: AgentHistoryItem[],
  existingResults: HeuristicFillResult[],
  userDescription?: string,
): HeuristicFillResult[] {
  const manifestMap = new Map(manifest.map((d) => [d.questionId, d]));
  const userAcc = new Set([
    ...history.flatMap((h) => h.selectedOptionIds),
    ...existingResults.flatMap((r) => r.selectedOptionIds),
  ]);
  const filled = new Set(existingResults.map((r) => r.questionId));
  const results: HeuristicFillResult[] = [];
  const descLower = (userDescription ?? "").toLowerCase();

  for (const qid of missingQuestionIds) {
    if (!fillSet.includes(qid)) continue;
    if (filled.has(qid)) continue;

    const dim = manifestMap.get(qid);
    if (!dim || dim.mode === "free_text") continue;

    const blocked = conflictIdsFor(userAcc, { includeCaution: true });
    const suggested = suggestedIdsFor(userAcc);
    const signals = fillBoostSignals(qid);
    const candidates = dim.options.filter((o) => !blocked.has(o.id));
    if (candidates.length === 0) continue;

    const pick =
      candidates.find((o) => suggested.has(o.id)) ??
      candidates.find((o) =>
        signals.some((s) => {
          const sig = s.toLowerCase();
          if (!descLower.includes(sig)) return false;
          return (
            o.label.toLowerCase().includes(sig) ||
            o.id.toLowerCase().includes(sig.replace(/\s/g, "_"))
          );
        }),
      ) ??
      candidates[0];

    const ids = [pick.id];
    results.push({ questionId: qid, selectedOptionIds: ids });
    filled.add(qid);
    userAcc.add(pick.id);
  }

  return results;
}

/** §7 core dims the LLM skipped — eligible for heuristic backfill. */
export function missingPortraitCoreFill(
  fillSet: string[],
  filledQuestionIds: Iterable<string>,
): string[] {
  const filled = new Set(filledQuestionIds);
  return PORTRAIT_CORE_FILL.filter((id) => fillSet.includes(id) && !filled.has(id));
}

/**
 * Compute which secondary dimensions to auto-fill.
 *
 * 1. Start from the active set at "standard" precision (covers essentials + secondary).
 * 2. Remove: already-asked, free_text-mode dims, tertiary dims, dims not in manifest.
 * 3. Keep only dims that are SECONDARY for the given type (not essential).
 * 4. Order by gradient's type.order, cap at `cap` (default 4).
 * 5. Return questionId[].
 */
export function computeFillSet(
  type: string,
  history: AgentHistoryItem[],
  manifest: CatalogManifest,
  cap = 4,
  gradient = GRADIENT,
  userDescription?: string,
): string[] {
  const t =
    gradient.primaryTypes.find((p) => p.type === type) ??
    gradient.primaryTypes.find((p) => p.type === "通用")!;

  // Active set at "standard" precision — includes essentials + secondary
  const active = resolveActiveSet(type, "standard", history, gradient, userDescription);
  applyCameraQuestionDemotion(active, history, userDescription);

  // Identify which dims are essential vs secondary at this type
  const essentialIds = new Set([
    ...gradient.shared.essential.map((g) => g.questionId),
    ...t.essential.map((g) => g.questionId),
  ]);

  // Tertiary ids for this type (to exclude)
  const tertiaryIds = new Set([
    ...t.tertiary.map((g) => g.questionId),
    ...gradient.shared.tertiary.map((g) => g.questionId),
  ]);

  // Already-asked
  const askedIds = new Set(history.map((h) => h.questionId));

  // Build manifest lookup for mode
  const manifestMap = new Map(manifest.map((d) => [d.questionId, d]));

  // Filter to secondary-only, non-asked, non-free_text, non-tertiary, in-manifest
  const fillCandidates: string[] = [];
  for (const qid of active) {
    if (essentialIds.has(qid)) continue;      // skip essentials (already asked or will be asked interactively)
    if (askedIds.has(qid)) continue;           // already answered
    if (tertiaryIds.has(qid)) continue;        // not in scope for auto-fill
    const dim = manifestMap.get(qid);
    if (!dim) continue;                         // not in catalog manifest
    if (dim.mode === "free_text") continue;     // free-text can't be auto-filled
    fillCandidates.push(qid);
  }

  // Order by gradient's type.order
  const orderIndex = new Map(t.order.map((id, i) => [id, i]));
  fillCandidates.sort((a, b) => {
    const ia = orderIndex.get(a) ?? Infinity;
    const ib = orderIndex.get(b) ?? Infinity;
    return ia - ib;
  });

  const ordered =
    type === "人像"
      ? applyPortraitFillPolicy(fillCandidates, userDescription)
      : boostFillCandidates(fillCandidates, userDescription);
  return ordered.slice(0, cap);
}
