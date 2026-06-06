import type { OptionSet } from "../../types";

/** 景别 / Shot size — how much of the subject fills the frame.
 *  Split out of the legacy `image_perspective` set (Slice 2 / Phase A).
 *  Prototype-only: the main-app worktype still uses image_perspective. */
export const imageFramingOptions: OptionSet = {
  id: "image_framing",
  version: "0.1.0",
  label: { zh: "景别", en: "Framing / shot size" },
  options: [
    {
      id: "image_framing:close_up",
      version: "0.1.0",
      label: { zh: "特写/充满画面", en: "Close-up / fill frame" },
      plain: { zh: "近距离特写，主体充满画面，细节清晰", en: "Close-up shot where the subject fills the frame with clear detail" },
      professionalTerms: ["close-up", "fill frame", "intimate", "subject-dominant"],
      promptFragment: { zh: "特写镜头，主体充满画面，细节清晰突出", en: "close-up shot filling the frame with the subject for clear prominent detail" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_framing:medium_shot",
      version: "0.1.0",
      label: { zh: "中景", en: "Medium shot" },
      plain: { zh: "半身或腰部以上构图，平衡主体和环境的关系", en: "Waist-up framing that balances subject presence with environmental context" },
      professionalTerms: ["medium shot", "waist-up", "balanced", "standard portrait"],
      promptFragment: { zh: "中景构图，半身或腰部以上，平衡主体与背景的关系", en: "medium shot composition, waist-up framing balancing subject and background" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_framing:wide_shot",
      version: "0.1.0",
      label: { zh: "远景/全景", en: "Wide shot / full body" },
      plain: { zh: "全景构图，展现主体的完整身姿或场景全貌", en: "Wide shot showing the full body of the subject or the complete scene" },
      professionalTerms: ["wide shot", "full body", "establishing", "environmental"],
      promptFragment: { zh: "远景全景构图，展现完整身姿或场景全貌", en: "wide shot composition showing the full body or complete scene in context" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_framing:extreme_wide",
      version: "0.1.0",
      label: { zh: "极远景", en: "Extreme wide shot" },
      plain: { zh: "超远距离拍摄，主体在画面中很小，强调宏大的空间尺度", en: "Extreme distance shot with a tiny subject emphasizing vast spatial scale" },
      professionalTerms: ["extreme wide shot", "tiny subject", "vast scene", "epic scale"],
      promptFragment: { zh: "极远景，主体在画面中显得渺小，强调宏大空间尺度", en: "extreme wide shot with a tiny subject emphasizing the vast epic scale of the scene" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
