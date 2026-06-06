import { tryGetOptionSet } from "../registry";
import type { PromptSelections } from "../types";
import { selectionArray } from "../utils";

export interface PublishAspectContext {
  candidateIds: string[] | null;
  conflict: boolean;
  mode: "all" | "single" | "choose" | "multi";
}

const GENERAL_ID = "image_publish_scenario:general";

export function getPublishAspectContext(
  selections: PromptSelections,
  allAspectIds: string[]
): PublishAspectContext {
  const set = tryGetOptionSet("image_publish_scenario");
  const selected = selectionArray(selections["publish_scenario"]);
  if (!set || selected.length === 0) {
    return { candidateIds: null, conflict: false, mode: "all" };
  }

  if (selected.includes(GENERAL_ID)) {
    return { candidateIds: null, conflict: false, mode: "all" };
  }

  const union = new Set<string>();
  for (const id of selected) {
    const opt = set.options.find((o) => o.id === id);
    if (!opt?.suggests?.aspect_ratio) continue;
    for (const rid of opt.suggests.aspect_ratio) {
      if (allAspectIds.includes(rid)) union.add(rid);
    }
  }

  const ids = [...union];
  if (ids.length === 0) return { candidateIds: null, conflict: false, mode: "all" };
  if (ids.length === 1) return { candidateIds: ids, conflict: false, mode: "single" };

  const conflict = selected.length > 1;
  return {
    candidateIds: ids,
    conflict,
    mode: conflict ? "choose" : "multi"
  };
}
