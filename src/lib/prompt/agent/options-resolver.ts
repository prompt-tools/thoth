import type { CatalogDimension, CatalogOption } from "./catalog-manifest";
import { hardConflictIdsFor } from "./audit-model";

/** Filter a dimension's options to those the user is allowed to see, excluding
 *  options that hard-conflict with current selections. Single source of truth
 *  for conflict-based option filtering. */
export function resolveVisibleOptions(
  dimension: CatalogDimension,
  allowOptionIds: string[],
  selectedOptionIds: string[],
): { visible: CatalogOption[]; conflictDropped: string[] } {
  const allow = new Set(allowOptionIds);
  const blocked = hardConflictIdsFor(selectedOptionIds);
  const visible = dimension.options.filter(
    (o) => allow.has(o.id) && !blocked.has(o.id),
  );
  const conflictDropped = allowOptionIds.filter((id) => blocked.has(id));
  return { visible, conflictDropped };
}
