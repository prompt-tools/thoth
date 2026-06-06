import type { OptionItem, OptionSet, TargetToolId, WorkTypeId } from "../types";

export type { TargetToolId, WorkTypeId };

// I-01: workTypeMap removed. Singleton resolution in work-type.registry.ts.
// I-02: targetMap + adapterMap removed. Singleton resolution in
//       target.registry.ts and adapter.registry.ts respectively.
export const optionSetMap = new Map<string, OptionSet>();
export const optionItemMap = new Map<string, OptionItem>();

/** Reverse index: optionId → Set of TargetToolId values that option supports (D-05). */
export const targetsByOption = new Map<string, Set<string>>();
