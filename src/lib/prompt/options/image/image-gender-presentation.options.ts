import type { OptionSet } from "../../types";

export const imageGenderPresentationOptions: OptionSet = {
  id: "image_gender_presentation",
  version: "0.1.0",
  label: { zh: "性别呈现", en: "Gender presentation" },
  options: [
    {
      id: "image_gender_presentation:feminine",
      version: "0.1.0",
      label: { zh: "女性化", en: "Feminine" },
      plain: { zh: "更偏女性化的脸部、发型和姿态", en: "More feminine facial features, hair, and body language" },
      professionalTerms: ["feminine presentation", "female-coded portrait", "soft feminine features"],
      promptFragment: { zh: "女性化气质，脸部线条柔和，姿态自然优雅", en: "feminine presentation with soft facial lines and naturally graceful body language" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_gender_presentation:masculine",
      version: "0.1.0",
      label: { zh: "男性化", en: "Masculine" },
      plain: { zh: "更偏男性化的轮廓和气质", en: "More masculine facial structure and presence" },
      professionalTerms: ["masculine presentation", "male-coded portrait", "defined masculine features"],
      promptFragment: { zh: "男性化气质，轮廓清晰，姿态沉稳自信", en: "masculine presentation with defined contours and calm confident body language" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_gender_presentation:androgynous",
      version: "0.1.0",
      label: { zh: "中性", en: "Androgynous" },
      plain: { zh: "介于男女之间的中性美感", en: "Androgynous beauty between feminine and masculine cues" },
      professionalTerms: ["androgynous", "gender-neutral presentation", "soft masculine and feminine mix"],
      promptFragment: { zh: "中性美感，柔和与利落并存，气质清冷独特", en: "androgynous beauty blending softness and sharpness, with a cool distinctive presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_gender_presentation:unspecified",
      version: "0.1.0",
      label: { zh: "不限定", en: "Unspecified" },
      plain: { zh: "不强调性别呈现，保留角色设定空间", en: "Do not emphasize gender presentation; keep room for character design" },
      professionalTerms: ["unspecified gender presentation", "character-first portrait"],
      promptFragment: { zh: "不刻意强调性别呈现，以角色气质和整体造型为主", en: "gender presentation is not emphasized, prioritizing character temperament and overall design" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
