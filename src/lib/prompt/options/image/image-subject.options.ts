import type { OptionSet } from "../../types";

export const imageSubjectOptions: OptionSet = {
  id: "image_subject",
  version: "0.1.0",
  label: { zh: "人物主体类型", en: "Portrait subject type" },
  categories: [
    {
      id: "cat:image_subject:people",
      label: { zh: "人物", en: "People" },
      optionIds: [
        "image_subject:single_person",
        "image_subject:beautiful_woman",
        "image_subject:handsome_man",
        "image_subject:couple_portrait",
        "image_subject:group_portrait",
        "image_subject:game_character",
        "image_subject:novel_character",
        "image_subject:otome_character",
        "image_subject:anime_character",
        "image_subject:virtual_idol",
        "image_subject:cosplay_character",
        "image_subject:character_design",
        "image_subject:silhouette_figure"
      ]
    }
  ],
  options: [
    {
      id: "image_subject:single_person",
      version: "0.1.0",
      label: { zh: "单人", en: "Single person" },
      plain: { zh: "一个人物主体，居中或偏置构图", en: "A single person as the main subject" },
      professionalTerms: ["single subject portrait", "solo figure", "one person", "individual"],
      promptFragment: {
        zh: "单个主体人物，清晰的面部特征和服装细节",
        en: "a single person subject with clear facial features and clothing details"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:beautiful_woman",
      version: "0.1.0",
      label: { zh: "漂亮女生/女性", en: "Beautiful woman" },
      plain: { zh: "以漂亮女生或女性为主体的人像", en: "A portrait centered on an attractive woman" },
      professionalTerms: ["beautiful woman portrait", "female portrait", "beauty portrait", "glamour portrait"],
      promptFragment: {
        zh: "漂亮女性人物主体，面部特征清晰，气质自然迷人",
        en: "a beautiful female subject with clear facial features and naturally attractive presence"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:handsome_man",
      version: "0.1.0",
      label: { zh: "帅气男生/男性", en: "Handsome man" },
      plain: { zh: "以帅气男生或男性为主体的人像", en: "A portrait centered on an attractive man" },
      professionalTerms: ["handsome man portrait", "male portrait", "attractive male subject", "editorial male portrait"],
      promptFragment: {
        zh: "帅气男性人物主体，轮廓清晰，气质自信有吸引力",
        en: "a handsome male subject with defined features and confident attractive presence"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:couple_portrait",
      version: "0.1.0",
      label: { zh: "情侣/双人", en: "Couple / duo" },
      plain: { zh: "两个人同框，有亲密或故事关系", en: "Two people in frame with an intimate or narrative relationship" },
      professionalTerms: ["couple portrait", "duo portrait", "two-person portrait", "romantic character scene"],
      promptFragment: {
        zh: "双人同框的人物场景，关系和互动清晰，氛围有故事感",
        en: "a two-person portrait scene with clear relationship, interaction, and narrative atmosphere"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:group_portrait",
      version: "0.1.0",
      label: { zh: "多人/群像", en: "Group portrait" },
      plain: { zh: "两人或多个人物同框的群像照片", en: "Two or more people in a group shot" },
      professionalTerms: ["group portrait", "multiple subjects", "crowd scene", "ensemble"],
      promptFragment: {
        zh: "多人同框的群像场景，人物之间的互动和空间关系清晰",
        en: "a group portrait with multiple people, clear interaction and spatial relationship between subjects"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:game_character",
      version: "0.1.0",
      label: { zh: "游戏角色", en: "Game character" },
      plain: { zh: "适合游戏立绘、卡面或角色宣传图的人物", en: "A game character for splash art, character art, or promo visuals" },
      professionalTerms: ["game character", "splash art", "gacha character", "RPG character", "hero character"],
      promptFragment: {
        zh: "游戏角色人物设计，造型鲜明，适合立绘、卡面或角色宣传图",
        en: "a game character design with distinctive styling, suitable for splash art, card art, or promotional character visuals"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:novel_character",
      version: "0.1.0",
      label: { zh: "小说人物", en: "Novel character" },
      plain: { zh: "面向小说封面、角色设定或故事人物的人像", en: "A story character for novel covers, character sheets, or narrative portraits" },
      professionalTerms: ["novel character", "book cover character", "story protagonist", "fictional character portrait"],
      promptFragment: {
        zh: "小说人物形象，带有明确身份气质和故事氛围",
        en: "a novel character portrait with clear identity, temperament, and story atmosphere"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:otome_character",
      version: "0.1.0",
      label: { zh: "乙游/视觉小说角色", en: "Otome / visual novel character" },
      plain: { zh: "乙游男主、女主或视觉小说角色", en: "An otome or visual novel character" },
      professionalTerms: ["otome character", "visual novel character", "romance game character", "dating sim character"],
      promptFragment: {
        zh: "乙游或视觉小说风格人物，情绪表达细腻，适合沉浸式恋爱剧情画面",
        en: "an otome or visual novel style character with nuanced emotion, suited for immersive romance story scenes"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:anime_character",
      version: "0.1.0",
      label: { zh: "二次元角色", en: "Anime character" },
      plain: { zh: "日系二次元、漫画或动画风格角色", en: "A Japanese anime, manga, or animation-style character" },
      professionalTerms: ["anime character", "manga character", "2D character", "anime portrait", "illustration character"],
      promptFragment: {
        zh: "二次元角色人物，五官精致，轮廓干净，适合动画或漫画风格表现",
        en: "an anime-style character with refined features and clean silhouette, suited for animation or manga-style rendering"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:virtual_idol",
      version: "0.1.0",
      label: { zh: "虚拟偶像/OC", en: "Virtual idol / OC" },
      plain: { zh: "虚拟主播、原创角色或虚拟偶像形象", en: "A VTuber, original character, or virtual idol persona" },
      professionalTerms: ["virtual idol", "VTuber", "original character", "OC", "avatar character"],
      promptFragment: {
        zh: "虚拟偶像或原创角色形象，辨识度高，适合作为头像、立绘或角色设定",
        en: "a virtual idol or original character with high recognizability, suitable for avatar art, standing illustration, or character design"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:cosplay_character",
      version: "0.1.0",
      label: { zh: "Cosplay/角色扮演", en: "Cosplay character" },
      plain: { zh: "真人或半写实的角色扮演人物", en: "A real or semi-realistic person in character cosplay" },
      professionalTerms: ["cosplay portrait", "costume character", "character cosplay", "semi-realistic cosplay"],
      promptFragment: {
        zh: "角色扮演人物，服装道具完整，兼具真人质感和角色设定感",
        en: "a cosplay character portrait with complete costume and props, balancing realistic presence with character design"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:character_design",
      version: "0.1.0",
      label: { zh: "角色设计", en: "Character design" },
      plain: { zh: "虚构/插画角色，完整人设展示", en: "A fictional/illustrated character with full design showcase" },
      professionalTerms: ["character design", "concept character", "original character", "OC", "turnaround"],
      promptFragment: {
        zh: "虚构角色设计，完整的服装、发型和造型展示",
        en: "a fictional character design with complete outfit, hairstyle, and styling showcase"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:silhouette_figure",
      version: "0.1.0",
      label: { zh: "剪影人物", en: "Silhouette figure" },
      plain: { zh: "人物以剪影/轮廓形式出现，不露面部细节", en: "A person shown as a silhouette without facial detail" },
      professionalTerms: ["silhouette", "backlit figure", "contre-jour", "outline figure"],
      promptFragment: {
        zh: "人物以剪影形式出现，只显示轮廓和姿态，面部细节不可见",
        en: "a person shown as a silhouette, revealing only the outline and posture without facial details"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
