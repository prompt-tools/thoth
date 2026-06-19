import type { OptionSet } from "../../types";

export const imagePersonTypeOptions: OptionSet = {
  id: "image_person_type",
  version: "0.1.0",
  label: { zh: "人物方向", en: "Portrait direction" },
  options: [
    {
      id: "image_person_type:realistic_beauty",
      version: "0.1.0",
      label: { zh: "真实系俊男美女", en: "Realistic beauty portrait" },
      plain: { zh: "偏真实摄影的漂亮男生或女生", en: "Photographic portrait of an attractive man or woman" },
      professionalTerms: ["beauty portrait", "editorial portrait", "realistic portrait"],
      promptFragment: { zh: "真实系俊男美女人像，五官清晰自然，审美偏精致写真", en: "realistic beauty portrait with clear natural facial features and refined editorial aesthetics" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:fashion_editorial",
      version: "0.1.0",
      label: { zh: "时尚写真", en: "Fashion editorial" },
      plain: { zh: "更强调造型、服饰和杂志感", en: "Focus on styling, wardrobe, and editorial fashion presence" },
      professionalTerms: ["fashion editorial", "magazine portrait", "model portrait"],
      promptFragment: { zh: "时尚杂志写真感，造型完整，服饰和姿态具有高级编辑感", en: "fashion editorial portrait with complete styling, refined wardrobe, and magazine-grade posing" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:game_character",
      version: "0.1.0",
      label: { zh: "游戏角色", en: "Game character" },
      plain: { zh: "适合游戏立绘、卡面或角色宣传图", en: "For game splash art, character cards, or promo art" },
      professionalTerms: ["game character", "splash art", "gacha art", "RPG character"],
      promptFragment: { zh: "游戏角色方向，角色辨识度高，适合立绘、卡面或宣传图", en: "game character direction with strong recognizability, suitable for splash art, card art, or promotional illustration" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:novel_character",
      version: "0.1.0",
      label: { zh: "小说人物", en: "Novel character" },
      plain: { zh: "适合小说封面或故事角色设定", en: "For novel covers or story character concepts" },
      professionalTerms: ["novel character", "book cover character", "fictional protagonist"],
      promptFragment: { zh: "小说人物方向，身份气质明确，带有强故事感和封面感", en: "novel character direction with clear identity, temperament, and strong story-cover presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:otome_visual_novel",
      version: "0.1.0",
      label: { zh: "乙游/视觉小说", en: "Otome / visual novel" },
      plain: { zh: "恋爱游戏、视觉小说和沉浸式剧情人物", en: "Romance game, visual novel, and immersive story characters" },
      professionalTerms: ["otome", "visual novel", "dating sim", "romance CG"],
      promptFragment: { zh: "乙游或视觉小说方向，情绪细腻，适合恋爱剧情 CG 和角色立绘", en: "otome or visual novel direction with nuanced emotion, suited for romance CG scenes and character sprites" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:anime_character",
      version: "0.1.0",
      label: { zh: "二次元角色", en: "Anime character" },
      plain: { zh: "日系动画、漫画和二次元角色", en: "Japanese anime, manga, and 2D character art" },
      professionalTerms: ["anime character", "manga style", "2D character", "anime key visual"],
      promptFragment: { zh: "二次元角色方向，轮廓干净，眼睛和发型辨识度强", en: "anime character direction with clean silhouette, expressive eyes, and distinctive hairstyle" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:virtual_idol",
      version: "0.1.0",
      label: { zh: "虚拟偶像/OC", en: "Virtual idol / OC" },
      plain: { zh: "虚拟主播、原创角色或头像设定", en: "VTuber, original character, or avatar persona" },
      professionalTerms: ["virtual idol", "VTuber", "original character", "OC", "avatar"],
      promptFragment: { zh: "虚拟偶像或原创角色方向，设定感强，适合头像、立绘和角色表", en: "virtual idol or original character direction with strong design identity, suitable for avatars, standing art, and character sheets" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_person_type:cosplay",
      version: "0.1.0",
      label: { zh: "Cosplay", en: "Cosplay" },
      plain: { zh: "真人角色扮演或半写实 cosplay", en: "Realistic or semi-realistic character cosplay" },
      professionalTerms: ["cosplay portrait", "character costume", "semi-realistic cosplay"],
      promptFragment: { zh: "角色扮演方向，真人质感与角色服装道具结合", en: "cosplay direction combining realistic human presence with character costume and props" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
