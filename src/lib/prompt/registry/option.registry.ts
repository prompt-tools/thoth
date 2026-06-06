import type { OptionItem, OptionSet, TargetToolId } from "../types";
import { optionItemMap, optionSetMap, targetsByOption } from "./state";

export function registerOptionSet(set: OptionSet): void {
  if (optionSetMap.has(set.id)) {
    throw new Error(`Duplicate option set: ${set.id}`);
  }
  for (const option of set.options) {
    if (optionItemMap.has(option.id)) {
      throw new Error(
        `Duplicate option ID "${option.id}" in set "${set.id}" conflicts with existing option`
      );
    }
    optionItemMap.set(option.id, option);
    // Populate reverse index for target switching (D-05)
    const optionTargets = targetsByOption.get(option.id);
    if (optionTargets) {
      for (const targetId of option.appliesTo) optionTargets.add(targetId);
    } else {
      targetsByOption.set(option.id, new Set(option.appliesTo));
    }
  }
  optionSetMap.set(set.id, set);
}

export function getOptionById(id: string): OptionItem | undefined {
  return optionItemMap.get(id);
}

export function tryGetOptionSet(id: string): OptionSet | undefined {
  return optionSetMap.get(id);
}

export function getOptionSet(id: string): OptionSet {
  const set = tryGetOptionSet(id);
  if (!set) {
    throw new Error(`Unknown option set: ${id}`);
  }
  return set;
}

export function getOptionsForTarget(
  optionSetId: string,
  targetId: TargetToolId
): OptionItem[] {
  const set = optionSetMap.get(optionSetId);
  if (!set) {
    return [];
  }
  return set.options.filter((option) => option.appliesTo.includes(targetId));
}

export function getAllOptionSets(): OptionSet[] {
  return [...optionSetMap.values()];
}

/** Reverse lookup: which targets does this option apply to? (D-05) */
export function getTargetsForOption(optionId: string): string[] {
  return [...(targetsByOption.get(optionId) ?? [])];
}

/** Query options by consumer-facing vocabulary term. Used for quick-entry tag selection.
 *  Returns all options whose consumerTerms array includes the given term. */
export function getOptionsByConsumerTerm(term: string): OptionItem[] {
  const results: OptionItem[] = [];
  for (const option of optionItemMap.values()) {
    if (option.consumerTerms?.includes(term)) {
      results.push(option);
    }
  }
  return results;
}
