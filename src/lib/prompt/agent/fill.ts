/**
 * fill.ts — compute the "fill set" for LLM auto-completion of secondary
 * dimensions that the interactive flow skipped (simple/standard precision).
 *
 * A3 in the Phase 2 plan.
 */
import {
  GRADIENT,
} from "./gradient";
import { resolveActiveSet } from "./active-dimensions";
import type { AgentHistoryItem } from "./decision";
import type { CatalogManifest } from "./catalog-manifest";

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
): string[] {
  const t =
    gradient.primaryTypes.find((p) => p.type === type) ??
    gradient.primaryTypes.find((p) => p.type === "通用")!;

  // Active set at "standard" precision — includes essentials + secondary
  const active = resolveActiveSet(type, "standard", history, gradient);

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

  return fillCandidates.slice(0, cap);
}
