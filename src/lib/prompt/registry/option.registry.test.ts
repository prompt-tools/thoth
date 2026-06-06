import { describe, expect, it } from "vitest";
import "@/lib/prompt/init";
import { getOptionSet, tryGetOptionSet } from "./option.registry";

describe("option.registry (F-S1)", () => {
  it("tryGetOptionSet returns image_use_case after init", () => {
    expect(tryGetOptionSet("image_use_case")?.id).toBe("image_use_case");
  });

  it("tryGetOptionSet returns undefined for unknown id without throwing", () => {
    expect(tryGetOptionSet("__missing_set__")).toBeUndefined();
  });

  it("getOptionSet still throws for unknown id", () => {
    expect(() => getOptionSet("__missing_set__")).toThrow(/Unknown option set/);
  });
});
