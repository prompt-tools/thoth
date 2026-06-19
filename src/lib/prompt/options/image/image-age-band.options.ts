import type { OptionSet } from "../../types";

export const imageAgeBandOptions: OptionSet = {
  id: "image_age_band",
  version: "0.1.0",
  label: { zh: "年龄段", en: "Age band" },
  options: [
    {
      id: "image_age_band:young_adult",
      version: "0.1.0",
      label: { zh: "青年", en: "Young adult" },
      plain: { zh: "18 岁以上的青年感人物", en: "Adult young-person look" },
      professionalTerms: ["young adult", "adult youth", "fresh young portrait"],
      promptFragment: { zh: "青年人物，面部状态自然清爽，充满年轻活力", en: "young adult subject with a fresh natural face and youthful vitality" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_age_band:mature_adult",
      version: "0.1.0",
      label: { zh: "成熟成年人", en: "Mature adult" },
      plain: { zh: "更成熟、稳重、有阅历感的人物", en: "A mature, composed, experienced adult" },
      professionalTerms: ["mature adult", "composed adult portrait", "experienced presence"],
      promptFragment: { zh: "成熟成年人气质，神态稳定，有阅历感和从容感", en: "mature adult presence with steady expression, life experience, and composure" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_age_band:middle_aged",
      version: "0.1.0",
      label: { zh: "中年", en: "Middle-aged" },
      plain: { zh: "中年人物，适合权威、职业或故事角色", en: "Middle-aged person for authority, career, or story roles" },
      professionalTerms: ["middle-aged portrait", "authoritative portrait", "seasoned character"],
      promptFragment: { zh: "中年人物，脸部有自然成熟纹理，气质沉稳可信", en: "middle-aged subject with natural mature facial texture and grounded trustworthy presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_age_band:elder",
      version: "0.1.0",
      label: { zh: "年长者", en: "Elder" },
      plain: { zh: "年长人物，强调岁月感和性格", en: "Older person emphasizing age, character, and history" },
      professionalTerms: ["elder portrait", "senior portrait", "aged character"],
      promptFragment: { zh: "年长者人物，面部纹理真实，带有岁月沉淀和鲜明性格", en: "elder subject with truthful facial texture, lived history, and distinct character" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_age_band:teen_character",
      version: "0.1.0",
      label: { zh: "少年/少女角色", en: "Teen character" },
      plain: { zh: "少年少女角色，必须保持健康非性感化", en: "Teen character, strictly healthy and non-sexualized" },
      professionalTerms: ["teen character", "young character", "non-sexualized youth"],
      promptFragment: { zh: "少年少女角色，健康清爽，非性感化表达", en: "teen character with healthy fresh styling and strictly non-sexualized presentation" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "未成年人相关内容必须避免性感化、暧昧姿态和暴露服装。", en: "Minor-related content must avoid sexualization, suggestive posing, and revealing clothing." }
    }
  ]
};
