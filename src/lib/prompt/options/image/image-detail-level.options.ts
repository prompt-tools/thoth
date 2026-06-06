import type { OptionSet } from "../../types";

export const imageDetailLevelOptions: OptionSet = {
  id: "image_detail_level",
  version: "0.1.0",
  label: { zh: "细节程度/画质", en: "Detail level / Quality" },
  options: [
    {
      id: "image_detail_level:hyper_detailed",
      version: "0.1.0",
      label: { zh: "极致细节/8K", en: "Hyper-detailed / 8K" },
      plain: { zh: "最高画质，追求每一处细节的极致呈现", en: "Maximum quality pursuing the highest possible detail everywhere" },
      professionalTerms: ["hyper-detailed", "8K", "ultra HD", "masterpiece", "maximum quality"],
      promptFragment: { zh: "极致细节，8K 超高清画质，每一处纹理都清晰可见", en: "hyper-detailed 8K ultra HD quality with every texture sharply visible" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "\"8K\"和\"masterpiece\"等质量关键词在 Midjourney 和 Stable Diffusion 社区中被验证能提升输出质量，但对部分模型可能无效", en: "Quality keywords like '8K' and 'masterpiece' are community-validated for Midjourney and SD, but may have no effect on some models." }
    },
    {
      id: "image_detail_level:high_detail",
      version: "0.1.0",
      label: { zh: "高清/4K", en: "High detail / 4K" },
      plain: { zh: "高质量细节，清晰锐利，适合大多数高质量需求", en: "High quality detail, sharp and polished for most high-quality needs" },
      professionalTerms: ["high detail", "4K", "sharp focus", "detailed", "polished"],
      promptFragment: { zh: "高清细节，4K 画质，清晰锐利", en: "high detail 4K quality, sharp and polished" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:moderate",
      version: "0.1.0",
      label: { zh: "标准/清晰", en: "Moderate / standard" },
      plain: { zh: "标准清晰的画质，细节适中，平衡性能与效果", en: "Standard clear quality with balanced detail, good performance-to-quality ratio" },
      professionalTerms: ["moderate detail", "clean", "clear", "standard quality", "balanced"],
      promptFragment: { zh: "标准清晰画质，细节适中", en: "moderate standard quality with clear balanced detail" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:simplified",
      version: "0.1.0",
      label: { zh: "简约/概括", en: "Simplified / clean" },
      plain: { zh: "简化概括的风格，减少细节，突出主体造型", en: "Simplified stylized look with reduced detail, emphasizing form over texture" },
      professionalTerms: ["simplified", "stylized", "clean geometry", "low detail", "abstracted"],
      promptFragment: { zh: "简约概括的风格，减少细节，突出主体造型", en: "simplified clean style with reduced detail emphasizing form" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:minimalist",
      version: "0.1.0",
      label: { zh: "极简/留白", en: "Minimalist / sparse" },
      plain: { zh: "极简抽象，大量留白，只保留最核心的视觉元素", en: "Ultra-minimal and abstract with generous negative space, only essential elements remain" },
      professionalTerms: ["minimalist", "low detail", "abstract", "sparse", "essential"],
      promptFragment: { zh: "极简风格，大量留白，只保留核心视觉元素", en: "minimalist sparse style with generous negative space, only essential elements" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:rough_loose",
      version: "0.1.0",
      label: { zh: "粗糙/写意", en: "Rough / loose" },
      plain: { zh: "粗犷写意的笔触，不追求精细，强调表现力", en: "Rough expressive strokes, prioritizing expression over precision" },
      professionalTerms: ["rough", "loose", "painterly", "expressive", "sketchy"],
      promptFragment: { zh: "粗犷写意的风格，笔触松散，强调表现力而非精细", en: "rough loose painterly style with expressive strokes over precision" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:cinematic_quality",
      version: "0.1.0",
      label: { zh: "电影级", en: "Cinematic quality" },
      plain: { zh: "电影级画质，有胶片质感和后期调色感", en: "Cinematic-grade quality with film texture and post-processed color grading feel" },
      professionalTerms: ["cinematic quality", "film grain", "post-processed", "movie-grade", "premium"],
      promptFragment: { zh: "电影级画质，胶片质感，专业后期调色感", en: "cinematic quality with film grain texture and professional post-processed look" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:sharp_clean",
      version: "0.1.0",
      label: { zh: "锐化/清晰", en: "Sharp / clean" },
      plain: { zh: "高清晰度锐化，边缘分明，无模糊", en: "High-clarity sharpened look with crisp defined edges, no blur" },
      professionalTerms: ["sharp", "crisp", "high clarity", "defined edges", "unblurred"],
      promptFragment: { zh: "锐化清晰，边缘分明，无模糊", en: "sharp crisp clarity with well-defined edges and no blur" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_detail_level:soft_focus",
      version: "0.1.0",
      label: { zh: "柔焦/梦幻", en: "Soft focus / dreamy" },
      plain: { zh: "柔焦效果，画面柔和朦胧，有梦幻感", en: "Soft focus effect with a gentle dreamy blur, romantic and ethereal" },
      professionalTerms: ["soft focus", "dreamy", "ethereal", "gentle blur", "romantic"],
      promptFragment: { zh: "柔焦效果，画面柔和朦胧，梦幻浪漫", en: "soft focus dreamy effect with gentle ethereal blur, romantic feel" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "柔焦效果与需要锐利细节的场景（如产品图、电商主图）存在冲突", en: "Soft focus conflicts with use cases requiring sharp detail (product shots, e-commerce)." }
    }
  ]
};
