import type { TemplateTargetConfig } from "../types";

export const genericImageTarget: TemplateTargetConfig = {
  id: "generic_image",
  version: "0.1.0",
  label: { zh: "通用图片模型", en: "Generic image model" },
  description: {
    zh: "不绑定特定平台的通用图片生成提示词，输出逗号分隔的自然语言关键词短语。",
    en: "A general image generation prompt that avoids platform-specific syntax. Outputs comma-separated natural language keyword phrases."
  },
  adaptationNote: {
    zh: "已按通用图片模型优化：使用 subject + scene + composition + lighting + art style + color + mood + perspective + detail level + post-processing + constraints 的自然语言短语结构。不含任何模型特定参数（如 --ar, --stylize 等）。",
    en: "Optimized for generic image models with natural language phrases: subject + scene + composition + lighting + art style + color + mood + perspective + detail level + post-processing + constraints. No model-specific parameters (--ar, --stylize, etc.)."
  },
  prefer: ["use_case", "subject", "scene", "composition", "lighting", "art_style", "color_palette", "mood", "perspective", "constraints"],
  suppress: [],
  safetyDefaults: [
    "image_constraints:no_ip_celebrity",
    "image_constraints:no_nsfw",
    "image_constraints:no_bad_anatomy",
    "image_constraints:no_low_quality"
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
    camera:          { zh: "{选项}", en: "{选项}" },
    product_material:{ zh: "{选项}", en: "{选项}" },
    weather:         { zh: "{选项}", en: "{选项}" }
  },
  negativePrompt: {
    default: "medium",
    texts: {
      light: {
        zh: "避免：不良解剖结构、低画质、模糊",
        en: "avoid: bad anatomy, low quality, blurry"
      },
      medium: {
        zh: "避免：不良解剖结构、低画质、模糊、水印、文字/签名、扭曲面部、多余肢体",
        en: "avoid: bad anatomy, low quality, blurry, watermarks, text/signatures, distorted faces, extra limbs"
      },
      heavy: {
        zh: "避免：不良解剖结构、低画质、模糊、水印、文字/签名、扭曲面部、多余肢体、画面拥挤混乱、混沌背景、畸形、比例失调",
        en: "avoid: bad anatomy, low quality, blurry, watermarks, text/signatures, distorted faces, extra limbs, cluttered composition, chaotic background, disfigured, bad proportions"
      }
    }
  }
};
