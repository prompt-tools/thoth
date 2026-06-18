import {
  GRADIENT,
  type Precision,
  type PrecompiledCondition,
} from "./gradient";
import type { AgentHistoryItem } from "./decision";

export const PRECISION_ORDER: Record<Precision, number> = {
  simple: 0,
  standard: 1,
  detailed: 2,
};

/**
 * Compute the "active set" (union + suppress subtract) for a given
 * type + precision + history.  Returns the suppress-post, pre-asked-removal
 * active dimension ids — the caller decides whether to subtract asked.
 *
 * A1: extracted from activeDimensions so both the controller and
 * computeFillSet can share the same formula.
 */
export function resolveActiveSet(
  type: string,
  precision: Precision,
  history: AgentHistoryItem[],
  gradient = GRADIENT,
): Set<string> {
  const t =
    gradient.primaryTypes.find((p) => p.type === type) ??
    gradient.primaryTypes.find((p) => p.type === "通用")!;

  const precNum = PRECISION_ORDER[precision];

  // Build active set (union)
  const active = new Set<string>();

  for (const item of gradient.shared.essential) active.add(item.questionId);
  for (const item of t.essential) active.add(item.questionId);

  if (precNum >= PRECISION_ORDER.standard) {
    for (const item of t.secondary) active.add(item.questionId);
  }

  if (precNum >= PRECISION_ORDER.detailed) {
    for (const item of t.tertiary) active.add(item.questionId);
    for (const item of gradient.shared.tertiary) active.add(item.questionId);
  }

  // Suppress subtract
  for (const c of t.conditional) {
    if (c.tierWhenActive !== "suppress") continue;
    if (!precisionMatches(precNum, c.minPrecision)) continue;
    if (conditionHolds(c.condition, history)) {
      active.delete(c.questionId);
    }
  }

  return active;
}

/**
 * Compute which dimensions are active for a given type + precision + history.
 *
 * Formula (union then suppress subtract):
 *   active = shared.essential ∪ type.essential
 *          ∪ (precision ≥ standard ? type.secondary : [])
 *          ∪ (precision == detailed ? type.tertiary ∪ shared.tertiary : [])
 *   REMOVE { c.questionId : c.tierWhenActive === "suppress"
 *            AND precision ≥ c.minPrecision (or minPrecision="any")
 *            AND condition holds against history }
 *
 * Returns ordered dimension ids (active − asked) and whether we're done.
 */
export function activeDimensions(
  type: string,
  precision: Precision,
  history: AgentHistoryItem[],
  gradient = GRADIENT,
): { ordered: string[]; done: boolean } {
  const active = resolveActiveSet(type, precision, history, gradient);

  // Remove already-asked
  const asked = new Set(history.map((h) => h.questionId));
  for (const qid of asked) active.delete(qid);

  const t =
    gradient.primaryTypes.find((p) => p.type === type) ??
    gradient.primaryTypes.find((p) => p.type === "通用")!;

  // Order: first by t.order, then remaining by shared.essential array order
  const orderSet = new Set(t.order);
  const ordered: string[] = [];

  // Append shared.essential (e.g. aspect_ratio) to order if not already in type order
  const fullOrder = [...t.order];
  for (const item of gradient.shared.essential) {
    if (!orderSet.has(item.questionId)) fullOrder.push(item.questionId);
  }

  for (const qid of fullOrder) {
    if (active.has(qid)) ordered.push(qid);
  }
  // Any remaining active not in fullOrder (shouldn't happen but safe)
  for (const qid of active) {
    if (!ordered.includes(qid)) ordered.push(qid);
  }

  return { ordered, done: ordered.length === 0 };
}

export function precisionMatches(precNum: number, minPrecision: Precision | "any"): boolean {
  if (minPrecision === "any") return true;
  return precNum >= PRECISION_ORDER[minPrecision];
}

export function conditionHolds(
  condition: PrecompiledCondition,
  history: AgentHistoryItem[],
): boolean {
  const histEntry = history.find((h) => h.questionId === condition.dimension);
  if (!histEntry) return false;
  const selected = new Set(histEntry.selectedOptionIds);
  return condition.values.some((v) => selected.has(v));
}
