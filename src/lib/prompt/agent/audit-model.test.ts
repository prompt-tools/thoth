import { describe, it, expect } from "vitest";
import "../init";
import { buildCatalogManifest } from "./catalog-manifest";
import {
  OPTION_CONFLICTS,
  OPTION_ASSOCIATIONS,
  hardConflictIdsFor,
  suggestedIdsFor,
} from "./audit-model";

/** Every option id the audit model references MUST exist in the live catalog.
 *  This locks the validate-audit gate into CI so a future regenerated model
 *  with hallucinated ids (the original Hermes failure) can never merge green. */
describe("audit-model id integrity", () => {
  const validOptionIds = new Set(
    buildCatalogManifest().flatMap((d) => d.options.map((o) => o.id))
  );

  it("catalog is non-empty (registry initialized)", () => {
    expect(validOptionIds.size).toBeGreaterThan(100);
  });

  it("all conflict ids exist in the catalog", () => {
    const phantom = OPTION_CONFLICTS.flatMap((c) => [c.a, c.b]).filter(
      (id) => !validOptionIds.has(id)
    );
    expect(phantom).toEqual([]);
  });

  it("all association ids exist in the catalog", () => {
    const phantom = OPTION_ASSOCIATIONS.flatMap((a) => [a.from, a.to]).filter(
      (id) => !validOptionIds.has(id)
    );
    expect(phantom).toEqual([]);
  });
});

describe("hardConflictIdsFor", () => {
  it("blocks the partner of a hard conflict, both directions", () => {
    const hard = OPTION_CONFLICTS.find((c) => c.relation === "conflict");
    if (!hard) throw new Error("expected at least one hard conflict in the model");
    expect(hardConflictIdsFor([hard.a])).toContain(hard.b);
    expect(hardConflictIdsFor([hard.b])).toContain(hard.a);
  });

  it("does not block on soft cautions", () => {
    const caution = OPTION_CONFLICTS.find((c) => c.relation === "caution");
    if (!caution) throw new Error("expected at least one caution in the model");
    // A caution-only selection should not hard-block its partner.
    const onlyCautionPair = !OPTION_CONFLICTS.some(
      (c) =>
        c.relation === "conflict" &&
        (c.a === caution.a || c.b === caution.a)
    );
    if (onlyCautionPair) {
      expect(hardConflictIdsFor([caution.a]).has(caution.b)).toBe(false);
    }
  });

  it("returns empty for no selections", () => {
    expect(hardConflictIdsFor([]).size).toBe(0);
  });
});

describe("suggestedIdsFor", () => {
  it("suggests the `to` of an association when its `from` is selected", () => {
    const a = OPTION_ASSOCIATIONS[0];
    expect(suggestedIdsFor([a.from])).toContain(a.to);
  });

  it("does not re-suggest an already-selected option", () => {
    const a = OPTION_ASSOCIATIONS[0];
    expect(suggestedIdsFor([a.from, a.to]).has(a.to)).toBe(false);
  });

  it("returns empty for no selections", () => {
    expect(suggestedIdsFor([]).size).toBe(0);
  });
});
