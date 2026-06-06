import type { TargetAdapter } from "../types";
import { genericImageAdapter } from "../renderers/generic-image.renderer";

/**
 * Image-only fork (finding I-02): there is exactly one adapter
 * (`genericImageAdapter`). The Map-based registry was overengineered for N=1
 * — folded per I-02, same pattern as I-01 (work-type registry).
 *
 * F-R5: `resolveAdapter()` takes no id — image fork has a single adapter.
 * `getAllAdapters` kept for validation / tripwire callers.
 */

export function resolveAdapter(): TargetAdapter {
  return genericImageAdapter;
}

export function getAllAdapters(): TargetAdapter[] {
  return [genericImageAdapter];
}
