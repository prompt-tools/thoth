import { describe, expect, it } from "vitest";
import { genericImageAdapter } from "../renderers/generic-image.renderer";
import { getAllAdapters, resolveAdapter } from "./adapter.registry";

describe("resolveAdapter (F-R5)", () => {
  it("returns the generic image adapter without a target id parameter", () => {
    expect(resolveAdapter()).toBe(genericImageAdapter);
  });
});

describe("getAllAdapters (N-2)", () => {
  it("returns an array aligned with getAllTargets", () => {
    const adapters = getAllAdapters();
    expect(Array.isArray(adapters)).toBe(true);
    expect(adapters.map((a) => a.target.id)).toEqual(["generic_image"]);
  });
});
