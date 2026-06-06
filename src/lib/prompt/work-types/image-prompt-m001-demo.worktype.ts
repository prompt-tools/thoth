import type { WorkTypeConfig } from "../types";

/** M001 本地演示：画幅（含应用场景注释）→ 风格 → 核心维；用途下沉高级。 */
export const imagePromptM001DemoWorkType: WorkTypeConfig = {
  id: "image_prompt",
  version: "0.1.0-m001-demo",
  label: { zh: "图片提示词", en: "Image prompt" },
  description: {
    zh: "M001 演示动线：画幅一步内选应用场景与比例，再定风格与画面要素。",
    en: "M001 demo: aspect ratio with inline scenarios, then style and scene."
  },
  questions: [
    {
      id: "aspect_ratio",
      version: "0.1.0",
      title: { zh: "画面比例", en: "Aspect ratio" },
      helper: {
        zh: "先选一个画面比例（必选）；可按下方应用场景缩小推荐，场景不写进提示词。",
        en: "Pick aspect ratio first; optional scenarios below narrow recommendations."
      },
      mode: "single",
      level: "core",
      required: true,
      optionSetId: "image_aspect_ratio"
    },
    {
      id: "art_style",
      version: "0.1.0",
      title: { zh: "整体风格是什么？", en: "What is the overall art style?" },
      helper: {
        zh: "不用懂术语，选最接近你脑中画面的风格。",
        en: "No jargon needed; choose the style closest to your idea."
      },
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_art_style",
      minSelections: 1
    },
    {
      id: "subject",
      version: "0.1.0",
      title: { zh: "画面主体是什么？", en: "What is the main subject?" },
      helper: {
        zh: "选择画面中最主要的视觉元素。",
        en: "Choose the primary visual element in the image."
      },
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_subject",
      minSelections: 1
    },
    {
      id: "scene",
      version: "0.1.0",
      title: { zh: "背景/场景是怎样的？", en: "What is the background/scene?" },
      helper: {
        zh: "选择一个能承载主体的典型场景或背景。",
        en: "Choose a typical scene or background for the subject."
      },
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_scene",
      minSelections: 1
    },
    {
      id: "lighting",
      version: "0.1.0",
      title: { zh: "光线是什么感觉？", en: "What should the lighting feel like?" },
      helper: {
        zh: "光线直接影响专业感和情绪。",
        en: "Lighting strongly affects polish and emotion."
      },
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_lighting",
      minSelections: 1
    },
    {
      id: "constraints",
      version: "0.1.0",
      title: { zh: "需要避免什么问题？", en: "What should be avoided?" },
      helper: {
        zh: "这些约束能降低变形、侵权等风险。",
        en: "These constraints reduce distortion, rights, and quality risks."
      },
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_constraints",
      minSelections: 1,
      maxSelections: 4
    },
    {
      id: "publish_scenario",
      version: "0.1.0",
      title: { zh: "发布场景", en: "Publish scenario" },
      helper: { zh: "", en: "" },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_publish_scenario"
    },
    {
      id: "use_case",
      version: "0.1.0",
      title: { zh: "创作场景（可选）", en: "Use case (optional)" },
      helper: {
        zh: "窄用途标签，可辅助推荐主体/场景；不进首屏主路径。",
        en: "Optional narrow use case; suggests subject/scene."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_use_case"
    },
    {
      id: "composition",
      version: "0.1.0",
      title: { zh: "画面怎么构图？", en: "How should the image be composed?" },
      helper: {
        zh: "决定视觉元素的排布和画框比例关系。",
        en: "Controls how visual elements are arranged within the frame."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_composition"
    },
    {
      id: "color_palette",
      version: "0.1.0",
      title: { zh: "想要什么色调？", en: "What color palette?" },
      helper: {
        zh: "色彩决定画面的整体氛围和品牌感。",
        en: "Color determines the overall atmosphere and brand feel."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_color_palette"
    },
    {
      id: "mood",
      version: "0.1.0",
      title: { zh: "画面情绪是什么？", en: "What mood should it convey?" },
      helper: {
        zh: "情绪影响观者的直觉感受。",
        en: "Mood shapes the viewer's intuitive emotional response."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_mood"
    },
    {
      id: "perspective",
      version: "0.1.0",
      title: { zh: "从什么视角看？", en: "What viewing perspective?" },
      helper: {
        zh: "决定观察者与主体的空间关系。",
        en: "Controls the spatial relationship between viewer and subject."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_perspective"
    },
    {
      id: "detail_level",
      version: "0.1.0",
      title: { zh: "细节程度如何？", en: "How detailed should it be?" },
      helper: {
        zh: "从极简到超精细，影响生成质量和风格。",
        en: "From minimal to hyper-detailed, affecting generation quality and style."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_detail_level"
    },
    {
      id: "post_processing",
      version: "0.1.0",
      title: { zh: "需要后期效果吗？", en: "Any post-processing effects?" },
      helper: {
        zh: "模拟摄影后期或特殊视觉处理效果。",
        en: "Simulate photographic post-processing or special visual treatments."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_post_processing"
    },
    {
      id: "time_season",
      version: "0.1.0",
      title: { zh: "时间/季节设定？", en: "Time period or season?" },
      helper: {
        zh: "设定画面的时间感和季节氛围。",
        en: "Set the time-of-day feeling and seasonal atmosphere."
      },
      mode: "multi",
      level: "advanced",
      required: false,
      optionSetId: "image_time_season"
    }
  ]
};
