import type { OptionSet } from "../../types";

export const imageBodyTypeOptions: OptionSet = {
  id: "image_body_type",
  version: "0.1.0",
  label: { zh: "体型/身形", en: "Body type" },
  options: [
    {
      id: "image_body_type:slim",
      version: "0.1.0",
      label: { zh: "纤细", en: "Slim" },
      plain: { zh: "身形纤细轻盈", en: "Slim and light body shape" },
      professionalTerms: ["slim build", "slender figure", "light silhouette"],
      promptFragment: { zh: "纤细轻盈的身形，线条修长自然", en: "slim light body shape with naturally elongated lines" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_body_type:balanced",
      version: "0.1.0",
      label: { zh: "匀称", en: "Balanced" },
      plain: { zh: "比例自然匀称，不夸张", en: "Natural balanced proportions without exaggeration" },
      professionalTerms: ["balanced build", "natural proportions", "proportional body"],
      promptFragment: { zh: "自然匀称的身形比例，不过度夸张，真实耐看", en: "naturally balanced body proportions, not exaggerated, realistic and pleasing" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_body_type:athletic",
      version: "0.1.0",
      label: { zh: "运动健美", en: "Athletic" },
      plain: { zh: "健康、有运动感的体态", en: "Healthy athletic physique" },
      professionalTerms: ["athletic build", "fit physique", "toned body"],
      promptFragment: { zh: "健康运动感身形，肌肉线条自然有活力", en: "healthy athletic physique with natural toned lines and energetic presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_body_type:curvy",
      version: "0.1.0",
      label: { zh: "柔和曲线", en: "Soft curves" },
      plain: { zh: "曲线柔和，但不做性感化表达", en: "Soft body curves without sexualized framing" },
      professionalTerms: ["soft curves", "curvy silhouette", "non-sexualized figure"],
      promptFragment: { zh: "柔和自然的身体曲线，表达健康美感，避免性感化姿态", en: "soft natural body curves expressing healthy beauty, avoiding sexualized posing" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "避免和未成年、暴露服饰或暧昧姿态组合。", en: "Avoid combining with minors, revealing clothing, or suggestive posing." }
    },
    {
      id: "image_body_type:tall_elegant",
      version: "0.1.0",
      label: { zh: "高挑优雅", en: "Tall elegant" },
      plain: { zh: "身形高挑，适合时尚或角色立绘", en: "Tall elegant silhouette for fashion or character art" },
      professionalTerms: ["tall silhouette", "elegant figure", "model-like proportions"],
      promptFragment: { zh: "高挑优雅的身形，比例修长，适合时尚写真或角色立绘", en: "tall elegant silhouette with elongated proportions, suited for fashion portraits or character standing art" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_body_type:strong_powerful",
      version: "0.1.0",
      label: { zh: "强壮有力", en: "Strong / powerful" },
      plain: { zh: "更强壮、有力量感的体型", en: "Stronger, more powerful physique" },
      professionalTerms: ["strong build", "powerful physique", "heroic body"],
      promptFragment: { zh: "强壮有力的体型，肩背线条稳定，带英雄感或战斗感", en: "strong powerful physique with stable shoulder and back lines, carrying heroic or combat-ready presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
