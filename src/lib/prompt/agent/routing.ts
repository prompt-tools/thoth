import { ENTRY_ROUTES } from "./audit-model";
import { GRADIENT } from "./gradient";

// Extended signals for Chinese terms not in ENTRY_ROUTES
const EXTENDED_SIGNALS: Record<string, string[]> = {
  "人像": ["女生", "女孩", "女士", "男人", "女人", "帅哥", "美女", "少年", "少女", "儿童", "婴儿", "portrait", "person", "people", "girl", "woman", "man", "boy"],
};

/**
 * Route a user description to a primary type by matching ENTRY_ROUTES signals.
 *
 * Tiebreak: 人像 wins on any hit → highest hit count → declaration order in GRADIENT.
 * Zero hits → "通用" (fallback).
 */
export function routePrimaryType(description: string): string {
  const lower = description.toLowerCase();

  let bestType = "";
  let bestCount = 0;
  let bestIndex = Infinity;

  for (const route of ENTRY_ROUTES) {
    let count = 0;
    for (const signal of route.signals) {
      if (lower.includes(signal.toLowerCase())) count++;
    }
    // Extended signals
    for (const signal of EXTENDED_SIGNALS[route.primaryType] || []) {
      if (lower.includes(signal.toLowerCase())) count++;
    }
    if (count === 0) continue;

    // 人像 priority: any hit on 人像 → win immediately
    if (route.primaryType === "人像") return "人像";

    if (count > bestCount || (count === bestCount && bestIndex > getGradientIndex(route.primaryType))) {
      bestCount = count;
      bestType = route.primaryType;
      bestIndex = getGradientIndex(route.primaryType);
    }
  }

  return bestType || "通用";
}

/** Get the index of a primaryType in GRADIENT.primaryTypes (declaration order). */
function getGradientIndex(type: string): number {
  const idx = GRADIENT.primaryTypes.findIndex((p) => p.type === type);
  return idx >= 0 ? idx : Infinity;
}
