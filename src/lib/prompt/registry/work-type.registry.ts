import type { WorkTypeConfig, WorkTypeId } from "../types";
import { imagePromptWorkType } from "../work-types/image-prompt.worktype";

/**
 * Image-only fork (I-01): there is exactly one work type (`image_prompt`).
 * The Map-based registry that existed in the sister repo
 * (controllable-prompt-guide) was designed for dynamic registration of N
 * work types. With N=1 the dispatch is overengineered — folded per I-01.
 *
 * `resolveWorkType` and `getAllWorkTypes` are kept as the public read API
 * so the 10+ caller sites don't churn. `registerWorkType` is removed; the
 * config validation it used to perform now runs once at module load via
 * `assertValidWorkTypeConfig` (see ./work-type-validator.ts).
 */

export function resolveWorkType(id: WorkTypeId): WorkTypeConfig {
  if (id !== "image_prompt") {
    // The TS type already enforces this at compile time; the runtime check
    // exists for code paths that read untrusted input (URL params, localStorage)
    // and may pass a string narrowed via type predicate.
    throw new Error(`Unknown work type: ${id}`);
  }
  return imagePromptWorkType;
}

export function getAllWorkTypes(): WorkTypeConfig[] {
  return [imagePromptWorkType];
}
