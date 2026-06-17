import type { OptionSet } from "../../types";

export const imageFaceFeaturesOptions: OptionSet = {
  id: "image_face_features",
  version: "0.1.0",
  label: { zh: "脸型/五官", en: "Face / features" },
  options: [
    {
      id: "image_face_features:soft_oval_face",
      version: "0.1.0",
      label: { zh: "柔和鹅蛋脸", en: "Soft oval face" },
      plain: { zh: "脸型柔和、比例均衡", en: "Soft oval face with balanced proportions" },
      professionalTerms: ["oval face", "soft facial structure", "balanced facial proportions"],
      promptFragment: { zh: "柔和鹅蛋脸，面部比例均衡，轮廓自然流畅", en: "soft oval face with balanced facial proportions and smooth natural contours" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_face_features:defined_jawline",
      version: "0.1.0",
      label: { zh: "清晰下颌线", en: "Defined jawline" },
      plain: { zh: "下颌线清晰，脸部更利落", en: "Defined jawline for a sharper facial outline" },
      professionalTerms: ["defined jawline", "sharp jaw", "sculpted face"],
      promptFragment: { zh: "清晰下颌线，脸部轮廓利落，五官更有雕塑感", en: "defined jawline with a clean facial outline and subtly sculpted features" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_face_features:delicate_features",
      version: "0.1.0",
      label: { zh: "精致五官", en: "Delicate features" },
      plain: { zh: "五官细腻精致，适合漂亮人像", en: "Delicate refined facial features for beauty portraits" },
      professionalTerms: ["delicate features", "refined facial features", "beauty face"],
      promptFragment: { zh: "精致细腻的五官，眼鼻唇比例协调，面部干净耐看", en: "delicate refined facial features with harmonious eyes, nose, and lips, clean and memorable face" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_face_features:deep_set_eyes",
      version: "0.1.0",
      label: { zh: "深邃眼睛", en: "Deep-set eyes" },
      plain: { zh: "眼窝和眼神更深邃", en: "Deeper-set eyes and stronger gaze" },
      professionalTerms: ["deep-set eyes", "intense eyes", "expressive gaze"],
      promptFragment: { zh: "深邃有神的眼睛，眼神清晰，有强烈注视感", en: "deep-set expressive eyes with clear gaze and strong eye contact" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_face_features:bright_clear_eyes",
      version: "0.1.0",
      label: { zh: "明亮清澈眼神", en: "Bright clear eyes" },
      plain: { zh: "眼睛明亮，带高光和清澈感", en: "Bright eyes with catchlights and clarity" },
      professionalTerms: ["bright eyes", "clear eyes", "catchlights", "iris detail"],
      promptFragment: { zh: "明亮清澈的眼神，双眼有自然高光，虹膜细节清晰", en: "bright clear eyes with natural catchlights in both eyes and sharp iris detail" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "人像质量核心项，能减少无神眼和空洞视线。", en: "Core portrait quality cue that reduces dull or empty eyes." }
    },
    {
      id: "image_face_features:high_cheekbones",
      version: "0.1.0",
      label: { zh: "高颧骨", en: "High cheekbones" },
      plain: { zh: "颧骨结构更明显，适合时尚感人像", en: "More visible cheekbone structure, suited for fashion portraits" },
      professionalTerms: ["high cheekbones", "structured cheekbones", "editorial facial structure"],
      promptFragment: { zh: "高颧骨结构，脸部立体感更强，带时尚编辑感", en: "high cheekbone structure with stronger facial dimension and editorial fashion presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_face_features:soft_round_face",
      version: "0.1.0",
      label: { zh: "圆润亲和脸", en: "Soft round face" },
      plain: { zh: "脸部圆润、亲切可爱", en: "Soft rounder face with approachable charm" },
      professionalTerms: ["round face", "soft face", "approachable features"],
      promptFragment: { zh: "圆润亲和的脸型，气质柔软可爱，表情更有亲近感", en: "soft round face with gentle cute presence and approachable expression" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_face_features:distinctive_marker",
      version: "0.1.0",
      label: { zh: "辨识标记", en: "Distinctive marker" },
      plain: { zh: "疤痕、泪痣、眼镜等一两个辨识点", en: "One or two markers like scar, beauty mark, or glasses" },
      professionalTerms: ["distinctive marker", "beauty mark", "scar", "glasses", "identity anchor"],
      promptFragment: { zh: "带一两个辨识度标记，如泪痣、细小疤痕或独特眼镜，增强角色记忆点", en: "one or two distinctive identity markers such as a beauty mark, subtle scar, or unique glasses, strengthening character recognizability" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
