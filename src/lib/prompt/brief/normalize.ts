import type { SelectionValue } from "../types";

export function normalizeSelection(value: SelectionValue | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
