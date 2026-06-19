import type { OptionSet } from "../../types";

export const imageCharacterArchetypeOptions: OptionSet = {
  id: "image_character_archetype",
  version: "0.1.0",
  label: { zh: "角色原型", en: "Character archetype" },
  options: [
    {
      id: "image_character_archetype:gentle_healer",
      version: "0.1.0",
      label: { zh: "温柔治愈系", en: "Gentle healer" },
      plain: { zh: "温柔、可靠、治愈感角色", en: "Gentle, reliable, comforting character" },
      professionalTerms: ["gentle healer", "soft character", "comforting presence"],
      promptFragment: { zh: "温柔治愈系角色，神态柔和可靠，带有让人安心的气质", en: "gentle healer archetype with soft reliable expression and comforting presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:cold_kuudere",
      version: "0.1.0",
      label: { zh: "清冷寡言", en: "Cool stoic" },
      plain: { zh: "冷静、克制、疏离但有吸引力", en: "Calm, restrained, distant yet attractive" },
      professionalTerms: ["kuudere", "cool stoic", "reserved character"],
      promptFragment: { zh: "清冷寡言的角色气质，表情克制，眼神疏离但有吸引力", en: "cool stoic archetype with restrained expression and distant yet magnetic gaze" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:tsundere",
      version: "0.1.0",
      label: { zh: "傲娇", en: "Tsundere" },
      plain: { zh: "外冷内热，有别扭可爱感", en: "Prickly outside, warm inside, awkwardly cute" },
      professionalTerms: ["tsundere", "prickly expression", "soft hidden affection"],
      promptFragment: { zh: "傲娇角色气质，表情带一点别扭和不服气，隐藏柔软情绪", en: "tsundere archetype with slightly prickly defiant expression and hidden softness" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:confident_leader",
      version: "0.1.0",
      label: { zh: "自信领袖", en: "Confident leader" },
      plain: { zh: "强势、可靠、有领导力", en: "Assertive, reliable, and leader-like" },
      professionalTerms: ["confident leader", "commanding presence", "hero leader"],
      promptFragment: { zh: "自信领袖型角色，姿态稳健，眼神有掌控力和责任感", en: "confident leader archetype with steady posture, commanding gaze, and sense of responsibility" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:mysterious_stranger",
      version: "0.1.0",
      label: { zh: "神秘旅人", en: "Mysterious stranger" },
      plain: { zh: "身份不明、故事感强、带神秘感", en: "Unknown identity, story-rich, mysterious" },
      professionalTerms: ["mysterious stranger", "enigmatic traveler", "secretive character"],
      promptFragment: { zh: "神秘旅人型角色，身份若隐若现，带有强烈故事悬念", en: "mysterious stranger archetype with ambiguous identity and strong narrative intrigue" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:playful_trickster",
      version: "0.1.0",
      label: { zh: "俏皮捣蛋", en: "Playful trickster" },
      plain: { zh: "活泼、调皮、聪明，有恶作剧感", en: "Lively, mischievous, clever, prankish" },
      professionalTerms: ["trickster", "playful character", "mischievous personality"],
      promptFragment: { zh: "俏皮捣蛋型角色，表情灵动，有聪明又顽皮的气质", en: "playful trickster archetype with lively expression and clever mischievous energy" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:dark_antihero",
      version: "0.1.0",
      label: { zh: "暗黑反英雄", en: "Dark antihero" },
      plain: { zh: "危险、复杂、有反英雄魅力", en: "Dangerous, complex, antihero charm" },
      professionalTerms: ["dark antihero", "morally gray character", "dangerous charm"],
      promptFragment: { zh: "暗黑反英雄气质，神情复杂，带危险感和压迫感", en: "dark antihero archetype with complex expression, dangerous aura, and pressure-filled presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:fantasy_mage",
      version: "0.1.0",
      label: { zh: "幻想法师", en: "Fantasy mage" },
      plain: { zh: "魔法、符文、长袍或奇幻设定", en: "Magic, runes, robes, or fantasy setting" },
      professionalTerms: ["fantasy mage", "wizard character", "magical character"],
      promptFragment: { zh: "幻想法师角色，带魔法符文、长袍或神秘道具，世界观感明确", en: "fantasy mage character with magical runes, robes, or mysterious props, clearly grounded in a fantasy world" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:warrior_guardian",
      version: "0.1.0",
      label: { zh: "战士/守护者", en: "Warrior / guardian" },
      plain: { zh: "战斗、护卫、英雄或骑士感", en: "Combat, guardian, hero, or knightly presence" },
      professionalTerms: ["warrior", "guardian", "knight", "combat character"],
      promptFragment: { zh: "战士或守护者角色，姿态坚定，服装道具带战斗和守护感", en: "warrior or guardian character with firm stance, costume, and props conveying combat and protection" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_archetype:elegant_noble",
      version: "0.1.0",
      label: { zh: "贵族/优雅权势", en: "Elegant noble" },
      plain: { zh: "贵族、王子公主、财阀或权势角色", en: "Noble, royal, tycoon, or high-status character" },
      professionalTerms: ["elegant noble", "royal character", "aristocratic presence", "CEO archetype"],
      promptFragment: { zh: "贵族或权势角色气质，服饰精致，姿态优雅从容", en: "elegant noble or high-status archetype with refined wardrobe and calm graceful posture" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
