import type { OptionSet } from "../../types";

export const imageSkinToneOptions: OptionSet = {
  id: "image_skin_tone",
  version: "0.1.0",
  label: { zh: "肤色/肤质", en: "Skin tone / texture" },
  options: [
    {
      id: "image_skin_tone:fair_porcelain",
      version: "0.1.0",
      label: { zh: "白皙瓷感", en: "Fair porcelain" },
      plain: { zh: "白皙、干净、瓷感肤色", en: "Fair, clean, porcelain-like skin tone" },
      professionalTerms: ["fair skin", "porcelain skin", "clear complexion"],
      promptFragment: { zh: "白皙瓷感肤色，肤色干净通透，保留自然皮肤纹理", en: "fair porcelain skin tone, clean translucent complexion, preserving natural skin texture" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_skin_tone:warm_light",
      version: "0.1.0",
      label: { zh: "暖调浅肤色", en: "Warm light skin" },
      plain: { zh: "自然暖调浅肤色", en: "Natural warm light skin tone" },
      professionalTerms: ["warm light skin", "natural warm complexion"],
      promptFragment: { zh: "自然暖调浅肤色，肤色均匀柔和，带真实皮肤质感", en: "natural warm light skin tone with even softness and realistic skin texture" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_skin_tone:golden_tan",
      version: "0.1.0",
      label: { zh: "小麦/古铜", en: "Golden tan" },
      plain: { zh: "健康小麦色或轻古铜肤色", en: "Healthy golden tan or light bronze complexion" },
      professionalTerms: ["golden tan", "bronze skin", "sun-kissed complexion"],
      promptFragment: { zh: "健康小麦色或轻古铜肤色，带自然光泽和运动感", en: "healthy golden tan or light bronze skin with natural glow and energetic presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_skin_tone:deep_brown",
      version: "0.1.0",
      label: { zh: "深棕肤色", en: "Deep brown skin" },
      plain: { zh: "深棕肤色，强调真实光泽和层次", en: "Deep brown skin tone with truthful glow and tonal depth" },
      professionalTerms: ["deep brown skin", "rich dark complexion", "melanated skin"],
      promptFragment: { zh: "深棕肤色，肤色层次丰富，光泽自然真实", en: "deep brown skin tone with rich tonal depth and natural realistic glow" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_skin_tone:natural_texture",
      version: "0.1.0",
      label: { zh: "自然肤质", en: "Natural skin texture" },
      plain: { zh: "保留毛孔、细纹和真实皮肤质感", en: "Preserve pores, fine lines, and realistic skin texture" },
      professionalTerms: ["natural skin texture", "visible pores", "real skin detail"],
      promptFragment: { zh: "自然皮肤质感，可见细微毛孔和真实肤理，避免塑料感磨皮", en: "natural skin texture with subtle visible pores and realistic skin detail, avoiding plastic over-smoothed skin" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "真实人像建议启用，能减少过度磨皮和塑料皮肤。", en: "Recommended for realistic portraits to reduce over-smoothed plastic skin." }
    },
    {
      id: "image_skin_tone:freckles_moles",
      version: "0.1.0",
      label: { zh: "雀斑/痣点", en: "Freckles / moles" },
      plain: { zh: "带少量雀斑、痣或自然皮肤标记", en: "A few freckles, moles, or natural skin marks" },
      professionalTerms: ["freckles", "beauty marks", "natural skin marks"],
      promptFragment: { zh: "少量自然雀斑或痣点，增加面部辨识度和真实感", en: "subtle natural freckles or beauty marks adding facial recognizability and realism" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
