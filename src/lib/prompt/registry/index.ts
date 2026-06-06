export type { TargetToolId, WorkTypeId } from "./state";

// I-01: registerWorkType removed (image-only fork has a singleton work type).
// Validation now runs at module-load via assertValidWorkTypeConfig.
export { resolveWorkType, getAllWorkTypes } from "./work-type.registry";
// I-02: registerTarget / registerAdapter removed (singleton target + adapter).
export { resolveTarget, getAllTargets } from "./target.registry";
export { resolveAdapter, getAllAdapters } from "./adapter.registry";
export {
  registerOptionSet,
  getOptionById,
  getOptionSet,
  tryGetOptionSet,
  getOptionsForTarget,
  getTargetsForOption,
  getOptionsByConsumerTerm,
  getAllOptionSets
} from "./option.registry";
