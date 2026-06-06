import { getOptionById } from "../registry";
import type { BriefItem, LocalizedText } from "../types";

/** Data-driven suppress detection (D-02). When option A suppresses option B and both are selected, B is removed and a warning generated. */
export function applySuppresses(
  items: BriefItem[]
): { visible: BriefItem[]; warnings: LocalizedText[] } {
  const warnings: LocalizedText[] = [];
  const allSelectedIds = new Set(
    items.flatMap((item) => item.selectedOptions.map((o) => o.id))
  );
  const suppressedIds = new Set<string>();

  for (const item of items) {
    for (const opt of item.selectedOptions) {
      if (opt.suppresses?.length) {
        for (const suppressedId of opt.suppresses) {
          if (allSelectedIds.has(suppressedId)) {
            suppressedIds.add(suppressedId);
            const suppressedOpt = getOptionById(suppressedId);
            const suppressedLabelZh = suppressedOpt?.label.zh ?? suppressedId;
            const suppressedLabelEn = suppressedOpt?.label.en ?? suppressedId;
            warnings.push({
              zh: `已选"${opt.label.zh}"，因此"${suppressedLabelZh}"不生效`,
              en: `"${opt.label.en}" overrides "${suppressedLabelEn}"`
            });
          }
        }
      }
    }
  }

  const visible = items
    .map((item) => ({
      ...item,
      selectedOptions: item.selectedOptions.filter((o) => !suppressedIds.has(o.id))
    }))
    // Keep items with picks, OR free-text-only items (free_text mode / escape hatch).
    .filter((item) => item.selectedOptions.length > 0 || Boolean(item.freeText?.trim()));

  return { visible, warnings };
}
