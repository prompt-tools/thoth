import type { OptionSet } from "../../types";

export const imageConstraintsOptions: OptionSet = {
  id: "image_constraints",
  version: "0.1.0",
  label: { zh: "约束/排除项", en: "Constraints / Negative prompts" },
  categories: [
    {
      id: "cat:image_constraints:quality",
      label: { zh: "画质保护", en: "Quality Protection" },
      optionIds: [
        "image_constraints:no_bad_anatomy", "image_constraints:no_low_quality",
        "image_constraints:no_distorted_face", "image_constraints:no_extra_limbs",
        "image_constraints:no_bad_proportions", "image_constraints:no_cloned_face"
      ]
    },
    {
      id: "cat:image_constraints:clean",
      label: { zh: "画面干净", en: "Clean Image" },
      optionIds: [
        "image_constraints:no_watermark", "image_constraints:no_cluttered",
        "image_constraints:no_text_errors", "image_constraints:no_oversaturated",
        "image_constraints:no_border_frame", "image_constraints:simple_background"
      ]
    },
    {
      id: "cat:image_constraints:safety",
      label: { zh: "安全/合规", en: "Safety / Compliance" },
      optionIds: [
        "image_constraints:no_ip_celebrity", "image_constraints:no_nsfw", "image_constraints:no_style_clash"
      ]
    }
  ],
  options: [
    // ── Quality Protection ──
    {
      id: "image_constraints:no_bad_anatomy",
      version: "0.1.0",
      label: { zh: "避免畸形/解剖错误", en: "Avoid bad anatomy" },
      plain: { zh: "防止AI生成扭曲变形的人体结构，这是图像模型最常见的失败模式", en: "Prevent twisted deformed anatomy — the #1 failure mode for AI image models" },
      professionalTerms: ["bad anatomy", "extra limbs", "disfigured", "poorly drawn hands", "anatomical errors"],
      promptFragment: { zh: "避免畸形、多余肢体和面部扭曲", en: "avoid bad anatomy, extra limbs, and disfigured faces" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "AI 图像生成最常见的失败模式：多余手指、扭曲肢体。此约束强烈建议启用。", en: "Universal AI image issue — extra fingers and twisted limbs are the #1 failure mode." }
    },
    {
      id: "image_constraints:no_low_quality",
      version: "0.1.0",
      label: { zh: "避免模糊/低画质", en: "Avoid low quality" },
      plain: { zh: "防止输出模糊、像素化或含有JPEG压缩伪影的图像", en: "Prevent blurry, pixelated, or JPEG-artifact-ridden output" },
      professionalTerms: ["low quality", "blurry", "low resolution", "pixelated", "jpeg artifacts"],
      promptFragment: { zh: "避免模糊、低分辨率、像素化和压缩伪影", en: "avoid low quality, blurriness, low resolution, and compression artifacts" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "所有图像生成的质量底线，建议默认启用", en: "Quality floor for all image generation — recommended as default." }
    },
    {
      id: "image_constraints:no_distorted_face",
      version: "0.1.0",
      label: { zh: "避免面部扭曲", en: "Avoid distorted faces" },
      plain: { zh: "防止人像面部不对称、眼睛大小不一等畸形", en: "Prevent asymmetrical eyes, deformed facial features in portraits" },
      professionalTerms: ["deformed face", "asymmetrical eyes", "distorted facial features", "ugly face"],
      promptFragment: { zh: "避免面部扭曲、不对称的五官和畸形的面部特征", en: "avoid deformed faces, asymmetrical features, and distorted facial characteristics" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "任何含有人物的图像都应启用此约束", en: "Critical for any image with people — recommended for all portraits." }
    },
    {
      id: "image_constraints:no_extra_limbs",
      version: "0.1.0",
      label: { zh: "避免多出肢体", en: "Avoid extra limbs" },
      plain: { zh: "防止人物出现多余的手臂、腿部或融合的身体部位", en: "Prevent extra arms, legs, or fused body parts on human subjects" },
      professionalTerms: ["extra limbs", "extra arms", "extra legs", "fused body", "conjoined"],
      promptFragment: { zh: "避免多出肢体、融合的身体部位", en: "avoid extra limbs, fused body parts, and conjoined figures" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "多人场景和复杂姿态时更常见此问题", en: "More common in multi-person scenes and complex poses." }
    },
    {
      id: "image_constraints:no_bad_proportions",
      version: "0.1.0",
      label: { zh: "避免比例失调", en: "Avoid bad proportions" },
      plain: { zh: "防止物体或人体的比例严重失调", en: "Prevent severely distorted proportions of objects or human bodies" },
      professionalTerms: ["bad proportions", "elongated", "squashed", "distorted", "unnatural scale"],
      promptFragment: { zh: "避免比例失调、拉长和压扁的变形", en: "avoid bad proportions, elongation, squashing, and unnatural scaling" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_constraints:no_cloned_face",
      version: "0.1.0",
      label: { zh: "避免克隆人/重复面孔", en: "Avoid cloned faces" },
      plain: { zh: "防止模型生成多个完全相同的人脸", en: "Prevent the model from creating identical copies of faces" },
      professionalTerms: ["cloned face", "identical face", "repeat subject", "twin", "duplicate"],
      promptFragment: { zh: "避免重复面孔、克隆人和相同的人物复制", en: "avoid cloned faces, identical copies, and duplicate subjects" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "多人场景中更容易出现人物面孔雷同的问题", en: "Face duplication is more common in group scenes." }
    },

    // ── Clean Image ──
    {
      id: "image_constraints:no_watermark",
      version: "0.1.0",
      label: { zh: "避免水印/签名", en: "Avoid watermark / signature" },
      plain: { zh: "防止模型在画面中添加水印、签名或Logo", en: "Prevent the model from adding watermark, signature, or logo artifacts" },
      professionalTerms: ["watermark", "signature", "text overlay", "logo", "username"],
      promptFragment: { zh: "避免水印、签名、Logo 和文字叠加", en: "avoid watermarks, signatures, logos, and text overlays" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "模型从训练数据中学习到水印模式，可能在输出中自动添加", en: "Models learn watermark patterns from training data and may auto-add them." }
    },
    {
      id: "image_constraints:no_cluttered",
      version: "0.1.0",
      label: { zh: "避免画面拥挤混乱", en: "Avoid cluttered composition" },
      plain: { zh: "防止画面元素过多过乱，保持视觉清晰", en: "Prevent too many elements creating visual chaos — keep it clear" },
      professionalTerms: ["cluttered", "messy", "chaotic", "too many elements", "busy", "disordered"],
      promptFragment: { zh: "避免画面拥挤混乱，保持视觉清晰", en: "avoid cluttered, messy composition — keep the image visually clear" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_constraints:no_text_errors",
      version: "0.1.0",
      label: { zh: "避免文字乱码", en: "Avoid garbled text" },
      plain: { zh: "防止画面中文字出现乱码、拼写错误或无法辨认", en: "Prevent garbled, misspelled, or illegible text in the image" },
      professionalTerms: ["text errors", "jpeg artifacts on text", "distorted text", "unreadable", "typo"],
      promptFragment: { zh: "避免文字乱码、拼写错误和无法辨认的文字", en: "avoid garbled text, typos, and illegible text rendering" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "文字渲染在所有图像模型中都不稳定，重要文字建议后期添加", en: "Text rendering is unreliable in all image models — add critical text in post." }
    },
    {
      id: "image_constraints:no_oversaturated",
      version: "0.1.0",
      label: { zh: "避免过度饱和", en: "Avoid oversaturated" },
      plain: { zh: "防止色彩过度饱和到不自然的程度", en: "Prevent unnaturally intense color saturation" },
      professionalTerms: ["oversaturated", "garish colors", "cartoonish saturation", "neon overkill"],
      promptFragment: { zh: "避免过度饱和、刺眼和不自然的色彩强度", en: "avoid oversaturated, garish, and unnaturally intense colors" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_constraints:no_border_frame",
      version: "0.1.0",
      label: { zh: "避免生成边框", en: "Avoid border / frame" },
      plain: { zh: "防止模型自动添加边框或画框", en: "Prevent the model from auto-adding borders or frames" },
      professionalTerms: ["frame", "border", "cropped poorly", "vignette artifact", "edge artifact"],
      promptFragment: { zh: "避免自动生成的边框或画框", en: "avoid auto-generated borders, frames, and edge artifacts" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_constraints:simple_background",
      version: "0.1.0",
      label: { zh: "简洁背景", en: "Simple background" },
      plain: { zh: "保持背景简洁干净，避免分散注意力的元素", en: "Keep the background clean and simple with minimal distracting elements" },
      professionalTerms: ["simple background", "clean backdrop", "uncluttered", "minimal distraction", "focused"],
      promptFragment: { zh: "简洁干净的背景，减少分散注意力的元素", en: "simple clean background with minimal distracting elements" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Safety / Compliance ──
    {
      id: "image_constraints:no_ip_celebrity",
      version: "0.1.0",
      label: { zh: "避开名人/IP", en: "Avoid celebrity / IP" },
      plain: { zh: "避免生成名人肖像或受版权保护的角色形象", en: "Avoid generating celebrity likenesses or copyrighted character depictions" },
      professionalTerms: ["celebrity", "famous person", "copyrighted character", "known IP", "trademark"],
      promptFragment: { zh: "避免名人肖像和受版权保护的角色形象", en: "avoid celebrity likenesses and copyrighted character depictions" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "IP 版权风险保护。生成平台的内容过滤器可能直接拦截含名人/IP 的提示词。", en: "IP risk protection. Generation platform content filters may block prompts referencing celebrities or known IP." }
    },
    {
      id: "image_constraints:no_nsfw",
      version: "0.1.0",
      label: { zh: "避免成人内容", en: "Avoid NSFW" },
      plain: { zh: "避免生成成人、暴力或不适宜的内容", en: "Avoid generating adult, violent, or inappropriate content" },
      professionalTerms: ["NSFW", "nude", "explicit content", "adult", "inappropriate"],
      promptFragment: { zh: "避免成人、露骨或不适宜的内容", en: "avoid NSFW, explicit, and inappropriate content" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "平台安全合规要求。多数生成平台会直接拦截含违规关键词的请求。", en: "Platform safety compliance. Most platforms block requests with policy-violating keywords." }
    },
    {
      id: "image_constraints:no_style_clash",
      version: "0.1.0",
      label: { zh: "避免风格混合冲突", en: "Avoid style clash" },
      plain: { zh: "防止模型混合不兼容的艺术风格产生怪异效果", en: "Prevent the model from blending incompatible art styles into an uncanny result" },
      professionalTerms: ["mixed styles", "style clash", "inconsistent aesthetics", "conflicting art styles"],
      promptFragment: { zh: "避免风格混合和不一致的美学表现", en: "avoid style clash and inconsistent aesthetic treatment" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "同时选择多个风格差异较大的选项时（如\"水墨风\"+\"赛博朋克\"），可能出现不协调的混合输出", en: "Selecting multiple style options with significant aesthetic differences may produce jarring hybrid outputs." }
    }
  ]
};
