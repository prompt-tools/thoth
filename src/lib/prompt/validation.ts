import { getAllAdapters, getAllOptionSets, getAllTargets } from "./registry";
import type { OptionSet, TargetToolConfig, WorkTypeConfig } from "./types";

/** Validates all option IDs use their catalog prefix (OPT-05). Returns mismatches. */
export function validateOptionIdFormat(sets?: OptionSet[]): string[] {
  const errors: string[] = [];
  for (const set of sets ?? getAllOptionSets()) {
    const prefix = `${set.id}:`;
    for (const opt of set.options) {
      if (!opt.id.startsWith(prefix)) {
        errors.push(`Option "${opt.id}" in set "${set.id}" should have namespace prefix "${prefix}"`);
      }
    }
  }
  return errors;
}

export function validateOptionIdsUnique(optionSets_?: OptionSet[]) {
  const sets = optionSets_ ?? getAllOptionSets();
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const option of sets.flatMap((set) => set.options)) {
    if (seen.has(option.id)) {
      duplicates.push(option.id);
    }
    seen.add(option.id);
  }

  return duplicates;
}

export function validateWorkTypeConfig(workType: WorkTypeConfig, optionSets_?: OptionSet[]) {
  const errors: string[] = [];
  const sets = optionSets_ ?? [];
  const optionSetIds = new Set(sets.map((set) => set.id));

  for (const question of workType.questions) {
    if (question.required && question.mode !== "free_text" && !question.optionSetId) {
      errors.push(`${question.id}: required choice question needs optionSetId`);
    }

    if (question.optionSetId && !optionSetIds.has(question.optionSetId)) {
      errors.push(`${question.id}: unknown optionSetId ${question.optionSetId}`);
    }

    if (question.mode === "multi" && question.maxSelections && question.minSelections) {
      if (question.minSelections > question.maxSelections) {
        errors.push(`${question.id}: minSelections is greater than maxSelections`);
      }
    }
  }

  return errors;
}

export function validateAdapterCompleteness(): string[] {
  const errors: string[] = [];
  const targets = getAllTargets();
  const adapterTargetIds = new Set(getAllAdapters().map((a) => a.target.id));

  for (const target of targets) {
    if (!adapterTargetIds.has(target.id)) {
      errors.push(`${target.id}: no adapter registered`);
    }
  }

  return errors;
}

export function validateOptionTargetRefs(): string[] {
  const errors: string[] = [];
  const targetIds = new Set(getAllTargets().map((t) => t.id));

  for (const set of getAllOptionSets()) {
    for (const option of set.options) {
      for (const ref of option.appliesTo) {
        if (!targetIds.has(ref)) {
          errors.push(
            `Option "${option.id}" in set "${set.id}" references unknown target: ${ref}`
          );
        }
      }
    }
  }

  return errors;
}

export function validateTargetConfig(target: TargetToolConfig) {
  const errors: string[] = [];

  if (target.prefer.length === 0) {
    errors.push(`${target.id}: prefer must not be empty`);
  }

  if (!target.adaptationNote.zh || !target.adaptationNote.en) {
    errors.push(`${target.id}: adaptation note must be localized`);
  }

  return errors;
}

export function validateSafetyDefaultsIntegrity(
  targets_?: TargetToolConfig[],
  optionSets_?: OptionSet[]
): string[] {
  const targets = targets_ ?? getAllTargets();
  const sets = optionSets_ ?? [];
  const allOptionIds = new Set(
    sets.flatMap((set) => set.options.map((o) => o.id))
  );

  const errors: string[] = [];

  for (const target of targets) {
    for (const optionId of target.safetyDefaults) {
      if (!allOptionIds.has(optionId)) {
        errors.push(
          `${target.id}: safetyDefaults references unknown option ID "${optionId}"`
        );
      }
    }
  }

  return errors;
}
