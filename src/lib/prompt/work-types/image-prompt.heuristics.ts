import type { HeuristicRule } from "../types";
import { selectionArray } from "../utils";

/** Art medium option IDs — used by the "multiple-mediums" rule.
 *  Excludes rendering techniques (photorealistic, vector_flat, 3d_render, etc.)
 *  which are not "mediums" in the traditional art sense. */
const IMAGE_ART_MEDIUM_IDS = [
  "image_art_style:oil_painting", "image_art_style:watercolor",
  "image_art_style:pencil_sketch", "image_art_style:acrylic_impasto",
  "image_art_style:digital_painting", "image_art_style:ink_wash",
  "image_art_style:line_art", "image_art_style:marker_drawing",
  "image_art_style:pastel_drawing", "image_art_style:woodcut_print",
  "image_art_style:collage", "image_art_style:paper_cut",
  "image_art_style:embroidery", "image_art_style:mosaic",
];

/** Volumetric/dramatic lighting option IDs — used by the flat-vector conflict rule. */
const VOLUMETRIC_LIGHTING_IDS = [
  "image_lighting:volumetric_god_rays",
  "image_lighting:hard_dramatic",
  "image_lighting:rim_light",
];

/** Rule 1: subject must be specified. */
const imageSubjectRequired: HeuristicRule = {
  id: "image:subject-required",
  evaluate({ selections }) {
    if (selectionArray(selections["subject"]).length > 0) return null;
    return {
      zh: "未指定主体 — 主体是图片生成最重要的维度，建议添加。",
      en: "No subject specified — subject is the most critical dimension for image generation. Consider adding one.",
    };
  },
};

/** Rule 2: photorealistic + anime style conflict. */
const photorealVsAnime: HeuristicRule = {
  id: "image:photorealistic-vs-anime",
  evaluate({ selections }) {
    const artStyleIds = selectionArray(selections["art_style"]);
    if (
      !artStyleIds.includes("image_art_style:photorealistic") ||
      !artStyleIds.includes("image_art_style:anime_manga")
    ) {
      return null;
    }
    return {
      zh: "同时选择了写实和动漫风格 — 两套视觉语言冲突，建议只保留其一。",
      en: "Both photorealistic and anime style selected — these visual languages conflict. Consider keeping only one.",
    };
  },
};

/** Rule 3: monochrome + vibrant color palette mutually exclusive. */
const monochromeVsVibrant: HeuristicRule = {
  id: "image:monochrome-vs-vibrant",
  evaluate({ selections }) {
    const colorPaletteIds = selectionArray(selections["color_palette"]);
    if (
      !colorPaletteIds.includes("image_color_palette:monochrome") ||
      !colorPaletteIds.includes("image_color_palette:vibrant")
    ) {
      return null;
    }
    return {
      zh: "黑白单色和高饱和色彩不能同时生效 — 两种色彩方案互斥，建议只保留其一。",
      en: "Black-and-white monochrome and vibrant color cannot coexist — these color schemes are mutually exclusive. Consider keeping only one.",
    };
  },
};

/** Rule 4: watercolor (soft) + sharp-focus styles conflict. */
const watercolorVsSharpFocus: HeuristicRule = {
  id: "image:watercolor-vs-sharp-focus",
  evaluate({ selections }) {
    const artStyleIds = selectionArray(selections["art_style"]);
    const sharpFocusIds = [
      "image_art_style:photorealistic",
      "image_art_style:photorealistic_render",
      "image_art_style:macro_photography",
    ];
    if (
      !artStyleIds.includes("image_art_style:watercolor") ||
      !sharpFocusIds.some((id) => artStyleIds.includes(id))
    ) {
      return null;
    }
    return {
      zh: "水彩风格通常使用柔和焦点，与锐焦/写实风格冲突 — 建议只保留其一。",
      en: "Watercolor style typically uses soft focus and conflicts with sharp/realistic rendering. Consider keeping only one.",
    };
  },
};

/** Rule 5: 3+ art mediums selected — texture instructions conflict. */
const multipleArtMediums: HeuristicRule = {
  id: "image:multiple-art-mediums",
  evaluate({ selections }) {
    const artStyleIds = selectionArray(selections["art_style"]);
    const selectedMediums = IMAGE_ART_MEDIUM_IDS.filter((id) => artStyleIds.includes(id));
    if (selectedMediums.length < 3) return null;
    const mediumLabels = selectedMediums.map((id) => id.replace("image_art_style:", "")).join("、");
    const mediumLabelsEn = selectedMediums.map((id) => id.replace("image_art_style:", "")).join(", ");
    return {
      zh: `选择了多种创作媒介（${mediumLabels}）— 建议只保留一个主要媒介。`,
      en: `Multiple art mediums selected (${mediumLabelsEn}) — consider keeping only one primary medium.`,
    };
  },
};

/** Rule 6: flat vector + volumetric lighting conflict. */
const flatVectorVsVolumetricLighting: HeuristicRule = {
  id: "image:flat-vector-vs-volumetric-lighting",
  evaluate({ selections }) {
    const artStyleIds = selectionArray(selections["art_style"]);
    const lightingIds = selectionArray(selections["lighting"]);
    if (
      !artStyleIds.includes("image_art_style:vector_flat") ||
      !VOLUMETRIC_LIGHTING_IDS.some((id) => lightingIds.includes(id))
    ) {
      return null;
    }
    return {
      zh: "扁平矢量风格不需要体积光 — 建议移除光线选择或改用其他风格。",
      en: "Flat vector style does not require volumetric lighting — consider removing lighting choices or switching art style.",
    };
  },
};

/** Rule 7: 3D render + hand-drawn styles conflict. */
const threeDVsHandDrawn: HeuristicRule = {
  id: "image:3d-vs-hand-drawn",
  evaluate({ selections }) {
    const artStyleIds = selectionArray(selections["art_style"]);
    const handDrawnIds = [
      "image_art_style:pencil_sketch",
      "image_art_style:line_art",
      "image_art_style:marker_drawing",
      "image_art_style:pastel_drawing",
    ];
    if (
      !artStyleIds.includes("image_art_style:3d_render") ||
      !handDrawnIds.some((id) => artStyleIds.includes(id))
    ) {
      return null;
    }
    return {
      zh: "3D渲染和手绘感是两种不同的创作方式 — 建议只保留其一。",
      en: "3D render and hand-drawn are different creative approaches — consider keeping only one.",
    };
  },
};

/** All quality-check rules for image_prompt work type, in order of evaluation. */
export const imageHeuristics: readonly HeuristicRule[] = [
  imageSubjectRequired,
  photorealVsAnime,
  monochromeVsVibrant,
  watercolorVsSharpFocus,
  multipleArtMediums,
  flatVectorVsVolumetricLighting,
  threeDVsHandDrawn,
];
