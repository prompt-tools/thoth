import type { TemplateTargetConfig } from "../types";

export const genericImageTarget: TemplateTargetConfig = {
  id: "generic_image",
  version: "0.1.0",
  label: { zh: "通用图片模型", en: "Generic image model" },
  description: {
    zh: "不绑定特定平台的人像/角色图片生成提示词，输出逗号分隔的自然语言关键词短语。",
    en: "A portrait and character image prompt that avoids platform-specific syntax. Outputs comma-separated natural language keyword phrases."
  },
  adaptationNote: {
    zh: "已按通用图片模型的人像/角色生成优化：优先组织人物身份、脸部/肤质、表情、服饰、动作、场景、镜头、光线、风格和约束。不含任何模型特定参数（如 --ar, --stylize 等）。",
    en: "Optimized for portrait and character generation on generic image models: character identity, face/skin, expression, outfit, action, scene, camera, lighting, style, and constraints. No model-specific parameters (--ar, --stylize, etc.)."
  },
  prefer: ["use_case", "subject", "framing", "portrait_expression", "scene", "lighting", "art_style", "color_palette", "mood", "constraints"],
  suppress: [],
  safetyDefaults: [
    "image_constraints:no_ip_celebrity",
    "image_constraints:no_nsfw",
    "image_constraints:no_sexualized_minors",
    "image_constraints:no_bad_anatomy",
    "image_constraints:no_low_quality",
    "image_constraints:no_distorted_face",
    "image_constraints:no_extra_limbs",
    "image_constraints:no_extra_fingers",
    "image_constraints:no_plastic_skin",
  ],
  supportedWorkTypes: ["image_prompt"],
  templateMap: {
    use_case:        { zh: "{选项}", en: "{选项}" },
    subject:         { zh: "{选项}", en: "{选项}" },
    scene:           { zh: "{选项}", en: "{选项}" },
    composition:     { zh: "{选项}", en: "{选项}" },
    lighting:        { zh: "{选项}", en: "{选项}" },
    art_style:       { zh: "{选项}", en: "{选项}" },
    color_palette:   { zh: "{选项}", en: "{选项}" },
    mood:            { zh: "{选项}", en: "{选项}" },
    perspective:     { zh: "{选项}", en: "{选项}" },
    framing:         { zh: "{选项}", en: "{选项}" },
    camera_angle:    { zh: "{选项}", en: "{选项}" },
    aspect_ratio:    { zh: "{选项}", en: "{选项}" },
    detail_level:    { zh: "{选项}", en: "{选项}" },
    post_processing: { zh: "{选项}", en: "{选项}" },
    constraints:     { zh: "{选项}", en: "{选项}" },
    time_season:     { zh: "{选项}", en: "{选项}" },
    camera:          { zh: "{选项}", en: "{选项}" }
  },
  negativePrompt: {
    default: "medium",
    texts: {
      light: {
        zh: "避免：不良解剖结构、低画质、模糊",
        en: "avoid: bad anatomy, low quality, blurry"
      },
      medium: {
        zh: "避免：不良解剖结构、低画质、模糊、水印、文字/签名、扭曲面部、多余肢体、多手指、塑料磨皮",
        en: "avoid: bad anatomy, low quality, blurry, watermarks, text/signatures, distorted faces, extra limbs, extra fingers, plastic over-smoothed skin"
      },
      heavy: {
        zh: "避免：不良解剖结构、低画质、模糊、水印、文字/签名、扭曲面部、多余肢体、多手指、塑料磨皮、画面拥挤混乱、混沌背景、畸形、比例失调",
        en: "avoid: bad anatomy, low quality, blurry, watermarks, text/signatures, distorted faces, extra limbs, extra fingers, plastic over-smoothed skin, cluttered composition, chaotic background, disfigured, bad proportions"
      }
    }
  }
};
