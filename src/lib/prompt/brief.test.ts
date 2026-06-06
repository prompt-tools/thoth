import { describe, it, expect } from "vitest";
import "./init";
import { applySuppresses } from "./brief/suppress";
import { getOptionById } from "./registry";
import type { BriefItem } from "./types";

describe("applySuppresses", () => {
  it("filters suppressed options and emits localized warnings", () => {
    const items: BriefItem[] = [
      {
        questionId: "style",
        title: { zh: "风格", en: "Style" },
        selectedOptions: [
          {
            id: "image_art_style:minimal",
            version: "0.1.0",
            label: { zh: "极简", en: "Minimal" },
            plain: { zh: "", en: "" },
            professionalTerms: [],
            promptFragment: { zh: "极简风格", en: "minimal style" },
            appliesTo: ["generic_image"],
            suppresses: ["image_art_style:busy"],
          },
          {
            id: "image_art_style:busy",
            version: "0.1.0",
            label: { zh: "繁复", en: "Busy" },
            plain: { zh: "", en: "" },
            professionalTerms: [],
            promptFragment: { zh: "繁复风格", en: "busy style" },
            appliesTo: ["generic_image"],
          },
        ],
      },
    ];

    const { visible, warnings } = applySuppresses(items);
    const visibleIds = visible.flatMap((i) => i.selectedOptions.map((o) => o.id));
    expect(visibleIds).toContain("image_art_style:minimal");
    expect(visibleIds).not.toContain("image_art_style:busy");
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]?.zh).toContain("极简");
  });

  it("warning text uses human label for the suppressor option (A6)", () => {
    const items: BriefItem[] = [
      {
        questionId: "style",
        title: { zh: "风格", en: "Style" },
        selectedOptions: [
          {
            id: "image_art_style:minimal",
            version: "0.1.0",
            label: { zh: "极简", en: "Minimal" },
            plain: { zh: "", en: "" },
            professionalTerms: [],
            promptFragment: { zh: "极简风格", en: "minimal style" },
            appliesTo: ["generic_image"],
            suppresses: ["image_art_style:busy"],
          },
          {
            id: "image_art_style:busy",
            version: "0.1.0",
            label: { zh: "繁复", en: "Busy" },
            plain: { zh: "", en: "" },
            professionalTerms: [],
            promptFragment: { zh: "繁复风格", en: "busy style" },
            appliesTo: ["generic_image"],
          },
        ],
      },
    ];

    const { warnings } = applySuppresses(items);
    expect(warnings[0]?.zh).toContain("极简");
    expect(warnings[0]?.zh).not.toContain("image_art_style:minimal");
  });

  it("falls back to raw id if the suppressed option is not registered", () => {
    const killer = getOptionById("image_art_style:photorealistic");
    expect(killer).toBeDefined();

    const synthetic: BriefItem = {
      questionId: "art_style",
      title: { zh: "风格", en: "Style" },
      selectedOptions: [
        {
          ...killer!,
          suppresses: ["image_art_style:does_not_exist"],
        },
        {
          id: "image_art_style:does_not_exist",
          version: "0.1.0",
          label: { zh: "不存在", en: "Missing" },
          plain: { zh: "", en: "" },
          professionalTerms: [],
          promptFragment: { zh: "", en: "" },
          appliesTo: ["generic_image"],
        },
      ],
    };

    const { warnings } = applySuppresses([synthetic]);
    expect(warnings.some((w) => w.zh.includes("image_art_style:does_not_exist"))).toBe(true);
  });
});
