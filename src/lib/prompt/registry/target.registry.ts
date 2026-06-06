import type { TargetToolConfig, TargetToolId } from "../types";
import { genericImageTarget } from "../targets/generic-image.target";

/**
 * Image-only fork (finding I-02): there is exactly one target
 * (`generic_image`). The Map-based registry was overengineered for N=1 —
 * folded per I-02, same pattern as I-01 (work-type registry).
 *
 * `resolveTarget` / `getAllTargets` kept as the public read API so caller
 * sites don't churn. `registerTarget` removed; targets/index.ts no longer
 * runs a registration loop. No validator needed — `registerTarget` only
 * enforced duplicate-id, which is moot when there's a single literal id.
 */

export function resolveTarget(id: TargetToolId): TargetToolConfig {
  if (id !== "generic_image") {
    // TS already enforces this at compile time; runtime check guards
    // untrusted-input paths (URL params, localStorage type predicates).
    throw new Error(`Unknown target: ${id}`);
  }
  return genericImageTarget;
}

export function getAllTargets(): TargetToolConfig[] {
  return [genericImageTarget];
}
