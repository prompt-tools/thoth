import type { TargetToolConfig, TargetToolId } from "../types";
import { genericImageTarget } from "./generic-image.target";

// I-02: registerTarget side-effect loop removed. The target singleton is
// resolved directly in registry/target.registry.ts. This file remains as a
// barrel for callers that want the full `targetTools` array (e.g.
// validation tests) and the `getTargetTool` helper.

export const targetTools = [genericImageTarget] satisfies TargetToolConfig[];

export function getTargetTool(targetToolId: TargetToolId): TargetToolConfig {
  const target = targetTools.find((tool) => tool.id === targetToolId);
  if (!target) {
    throw new Error(`Unknown target tool: ${targetToolId}`);
  }
  return target;
}
