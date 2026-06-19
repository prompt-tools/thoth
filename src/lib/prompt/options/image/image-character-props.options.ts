import type { OptionSet } from "../../types";

/** 角色道具 / character props — weapons, tools, and handheld items for fictional characters. */
export const imageCharacterPropsOptions: OptionSet = {
  id: "image_character_props",
  version: "0.1.0",
  label: { zh: "手持道具", en: "Character props" },
  options: [
    {
      id: "image_character_props:none",
      version: "0.1.0",
      label: { zh: "无道具/空手", en: "No prop" },
      plain: { zh: "不强调手持物品，双手自然或空着", en: "No emphasized handheld item, hands natural or empty" },
      professionalTerms: ["empty hands", "no prop"],
      promptFragment: { zh: "无突出手持道具，双手自然", en: "no prominent handheld prop, natural empty hands" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_props:sword",
      version: "0.1.0",
      label: { zh: "剑/长刀", en: "Sword" },
      plain: { zh: "手持剑或长刀，战斗或骑士气质", en: "Holding a sword or long blade, warrior or knight mood" },
      professionalTerms: ["holding sword", "blade weapon", "warrior prop"],
      promptFragment: { zh: "手持剑或长刀，姿态带战斗或骑士气质", en: "holding a sword or long blade with warrior or knight presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_props:staff",
      version: "0.1.0",
      label: { zh: "法杖/长杖", en: "Staff / wand" },
      plain: { zh: "手持法杖或长杖，法师或奇幻角色感", en: "Holding a staff or wand, mage or fantasy character feel" },
      professionalTerms: ["magic staff", "wizard staff", "fantasy wand"],
      promptFragment: { zh: "手持法杖或长杖，带有法师或奇幻角色气质", en: "holding a magic staff or wand with mage or fantasy character presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_props:book",
      version: "0.1.0",
      label: { zh: "书/卷轴", en: "Book / scroll" },
      plain: { zh: "手持书、笔记本或卷轴，学者或叙事感", en: "Holding a book, notebook, or scroll, scholarly or narrative mood" },
      professionalTerms: ["holding book", "scroll", "scholar prop"],
      promptFragment: { zh: "手持书或卷轴，带有学者或故事叙事感", en: "holding a book or scroll with scholarly narrative presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_props:microphone",
      version: "0.1.0",
      label: { zh: "麦克风/话筒", en: "Microphone" },
      plain: { zh: "手持麦克风，偶像、歌手或舞台表演感", en: "Holding a microphone, idol, singer, or stage performance mood" },
      professionalTerms: ["holding microphone", "idol mic", "stage performance"],
      promptFragment: { zh: "手持麦克风，带有偶像或舞台表演气质", en: "holding a microphone with idol or stage performance presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_props:shield",
      version: "0.1.0",
      label: { zh: "盾/防具", en: "Shield" },
      plain: { zh: "手持盾牌或防具，守护者或战士角色感", en: "Holding a shield or defensive gear, guardian or warrior character feel" },
      professionalTerms: ["holding shield", "knight shield", "defensive prop"],
      promptFragment: { zh: "手持盾牌或防具，带有守护者或战士角色气质", en: "holding a shield or defensive gear with guardian or warrior character presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
