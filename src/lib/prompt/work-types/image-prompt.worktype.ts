import type { WorkTypeConfig } from "../types";

export const imagePromptWorkType: WorkTypeConfig = {
  id: "image_prompt",
  version: "0.1.0",
  label: { zh: "图片提示词", en: "Image prompt" },
  description: {
    zh: "通过选择题生成可复制的图片提示词。",
    en: "Generate copy-ready image prompts through guided choices."
  },
  questions: [
    {
      id: "use_case",
      version: "0.1.0",
      title: { zh: "你想做什么类型的图？", en: "What type of image do you want to create?" },
      helper: {
        zh: "选择图片用途，系统会把用途描述写入提示词。",
        en: "Choose the image use case; the system writes it into the prompt."
      },
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_use_case",
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
      // Single: an image has ONE background/scene (the helper says "选择一个…场景").
      // Multi let auto-fill/user pick a 2nd conflicting environment (garden+studio,
      // bokeh+studio) — a top adaptive-loss cause (autofill-seed-blind finding).
      mode: "single",
      level: "core",
      required: true,
      optionSetId: "image_scene",
      minSelections: 1
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
      level: "core",
      required: true,
      optionSetId: "image_composition",
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
      id: "art_style",
      version: "0.1.0",
      title: { zh: "整体风格是什么？", en: "What is the overall art style?" },
      helper: {
        zh: "不用懂术语，选最接近你脑中画面的风格。",
        en: "No jargon needed; choose the style closest to your idea."
      },
      // NOTE: art_style stays multi for now. The judge losses show user-style +
      // auto-filled-photo-style conflicts (oil_painting+portrait_photography), which argues
      // for single — but single-select breaks the consumer-aesthetic-tag feature (DIFF-01),
      // so it needs a proper UX design pass, not a quick flip (autofill-seed-blind finding).
      mode: "multi",
      level: "core",
      required: true,
      optionSetId: "image_art_style",
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
      id: "aspect_ratio",
      version: "0.1.0",
      title: { zh: "画面比例是多少？", en: "What aspect ratio?" },
      helper: {
        zh: "选择画面宽高比，匹配发布平台。",
        en: "Choose the width-to-height ratio for your target platform."
      },
      // An image has exactly ONE aspect ratio — single-select prevents the contradictory
      // "9:16 + 4:5" prompts the judge flagged (autofill-seed-blind finding).
      mode: "single",
      level: "advanced",
      required: false,
      optionSetId: "image_aspect_ratio"
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

// Validation runs from init.ts after option sets are registered (F-S3).
