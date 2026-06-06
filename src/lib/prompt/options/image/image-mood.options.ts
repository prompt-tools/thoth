import type { OptionSet } from "../../types";

export const imageMoodOptions: OptionSet = {
  id: "image_mood",
  version: "0.1.0",
  label: { zh: "情绪/氛围", en: "Mood / Atmosphere" },
  categories: [
    {
      id: "cat:image_mood:positive",
      label: { zh: "积极/温暖", en: "Positive / Warm" },
      optionIds: [
        "image_mood:serene", "image_mood:warm_cozy", "image_mood:joyful_energetic",
        "image_mood:romantic_dreamy", "image_mood:hopeful_bright", "image_mood:playful_cute"
      ]
    },
    {
      id: "cat:image_mood:atmospheric",
      label: { zh: "氛围/情绪", en: "Atmospheric / Emotional" },
      optionIds: [
        "image_mood:cool_sleek", "image_mood:dark_moody", "image_mood:mysterious",
        "image_mood:epic_grand", "image_mood:lonely_solitary", "image_mood:nostalgic_vintage",
        "image_mood:solemn_dignified"
      ]
    },
    {
      id: "cat:image_mood:intense",
      label: { zh: "强烈/戏剧", en: "Intense / Dramatic" },
      optionIds: [
        "image_mood:futuristic_scifi", "image_mood:eerie_horror", "image_mood:luxurious_premium",
        "image_mood:wild_natural", "image_mood:dynamic_tense"
      ]
    }
  ],
  options: [
    // ── Positive / Warm ──
    {
      id: "image_mood:serene",
      version: "0.1.0",
      label: { zh: "宁静/治愈", en: "Serene / peaceful" },
      plain: { zh: "宁静平和的氛围，让人感到放松和被治愈", en: "Calm and peaceful atmosphere that feels soothing and healing" },
      professionalTerms: ["serene", "peaceful", "calming", "healing", "tranquil"],
      promptFragment: { zh: "宁静治愈的氛围，平和放松，温暖舒适", en: "serene and peaceful atmosphere, calming and healing, tranquil and comforting" },
      appliesTo: ["generic_image"],
      consumerTerms: ["治愈", "小清新"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:warm_cozy",
      version: "0.1.0",
      label: { zh: "温暖/温馨", en: "Warm / cozy" },
      plain: { zh: "温暖舒适的氛围，像在家里一样安心", en: "Warm and cozy atmosphere that feels like home, comforting" },
      professionalTerms: ["warm", "cozy", "intimate", "comforting", "hygge"],
      promptFragment: { zh: "温暖温馨的氛围，舒适安心，像家一样的亲切感", en: "warm and cozy atmosphere, intimate and comforting with a home-like feel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["温馨感", "治愈"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:cool_sleek",
      version: "0.1.0",
      label: { zh: "冷峻/酷感", en: "Cool / sleek" },
      plain: { zh: "冷色调的现代酷感，冷静克制有距离感", en: "Cool-toned modern sleekness, detached and sophisticated" },
      professionalTerms: ["cool", "sleek", "sophisticated", "detached", "modern"],
      promptFragment: { zh: "冷峻酷感的氛围，现代而克制，高级且疏离", en: "cool and sleek atmosphere, modern and detached with sophisticated distance" },
      appliesTo: ["generic_image"],
      consumerTerms: ["高级感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:dark_moody",
      version: "0.1.0",
      label: { zh: "暗黑/压抑", en: "Dark / moody" },
      plain: { zh: "黑暗忧郁的氛围，深色为主，情绪浓重", en: "Dark and brooding atmosphere with deep shadows and heavy emotional weight" },
      professionalTerms: ["dark", "moody", "brooding", "melancholic", "shadowy"],
      promptFragment: { zh: "暗黑压抑的氛围，深沉阴影，忧郁浓重的情绪", en: "dark moody atmosphere with deep brooding shadows and melancholic weight" },
      appliesTo: ["generic_image"],
      consumerTerms: ["暗黑风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:joyful_energetic",
      version: "0.1.0",
      label: { zh: "欢快/活力", en: "Joyful / energetic" },
      plain: { zh: "充满活力和欢乐的氛围，色彩明亮，节奏轻快", en: "Joyful and energetic mood with bright colors and lively spirit" },
      professionalTerms: ["joyful", "energetic", "vibrant", "lively", "upbeat"],
      promptFragment: { zh: "欢快充满活力的氛围，明亮色彩，轻松愉悦的能量", en: "joyful and energetic atmosphere with bright colors and lively upbeat energy" },
      appliesTo: ["generic_image"],
      consumerTerms: ["多巴胺"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:romantic_dreamy",
      version: "0.1.0",
      label: { zh: "浪漫/梦幻", en: "Romantic / dreamy" },
      plain: { zh: "浪漫梦幻的氛围，柔和光晕，如童话般美好", en: "Romantic and dreamy atmosphere with soft glow, like a fairy tale" },
      professionalTerms: ["romantic", "dreamy", "ethereal", "soft", "tender"],
      promptFragment: { zh: "浪漫梦幻的氛围，柔和光晕，童话般的美好感受", en: "romantic dreamy atmosphere with soft ethereal glow and fairy-tale tenderness" },
      appliesTo: ["generic_image"],
      consumerTerms: ["梦幻"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:mysterious",
      version: "0.1.0",
      label: { zh: "神秘/悬疑", en: "Mysterious / suspenseful" },
      plain: { zh: "神秘莫测的氛围，引人好奇和猜测", en: "Enigmatic and suspenseful mood that sparks curiosity" },
      professionalTerms: ["mysterious", "enigmatic", "suspenseful", "intrigue", "noir"],
      promptFragment: { zh: "神秘悬疑的氛围，引人好奇和猜测，暗藏玄机", en: "mysterious and suspenseful atmosphere, enigmatic and full of intrigue" },
      appliesTo: ["generic_image"],
      consumerTerms: ["氛围感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:epic_grand",
      version: "0.1.0",
      label: { zh: "史诗/宏大", en: "Epic / grand" },
      plain: { zh: "宏大史诗般的氛围，壮丽辽阔，令人敬畏", en: "Epic and grand atmosphere, majestic and awe-inspiring in scale" },
      professionalTerms: ["epic", "grand", "majestic", "awe-inspiring", "monumental"],
      promptFragment: { zh: "史诗宏大的氛围，壮丽辽阔，令人心生敬畏", en: "epic and grand atmosphere of monumental scale, majestic and awe-inspiring" },
      appliesTo: ["generic_image"],
      consumerTerms: ["大片感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:lonely_solitary",
      version: "0.1.0",
      label: { zh: "孤独/寂寥", en: "Lonely / solitary" },
      plain: { zh: "孤独寂寥的氛围，空旷安静，强调个体与空间的关系", en: "Lonely and solitary mood with empty quiet spaces emphasizing isolation" },
      professionalTerms: ["lonely", "solitary", "empty", "quiet", "isolated"],
      promptFragment: { zh: "孤独寂寥的氛围，空旷安静的空间，强调个体的存在感", en: "lonely solitary atmosphere with empty quiet space emphasizing isolation" },
      appliesTo: ["generic_image"],
      consumerTerms: ["氛围感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:hopeful_bright",
      version: "0.1.0",
      label: { zh: "希望/光明", en: "Hopeful / bright" },
      plain: { zh: "充满希望和光明的氛围，积极向上", en: "Hopeful and bright mood, optimistic and uplifting" },
      professionalTerms: ["hopeful", "bright", "optimistic", "uplifting", "radiant"],
      promptFragment: { zh: "充满希望和光明的氛围，积极向上的能量", en: "hopeful and bright atmosphere, optimistic and radiant with uplifting energy" },
      appliesTo: ["generic_image"],
      consumerTerms: ["治愈"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:nostalgic_vintage",
      version: "0.1.0",
      label: { zh: "复古/怀旧", en: "Nostalgic / vintage" },
      plain: { zh: "怀旧复古的氛围，温暖褪色，唤起过往记忆", en: "Nostalgic vintage mood with warm faded tones, evoking memories" },
      professionalTerms: ["nostalgic", "vintage", "retro", "wistful", "memory"],
      promptFragment: { zh: "怀旧复古的氛围，温暖褪色感，唤起过往的记忆", en: "nostalgic vintage atmosphere with warm faded tones evoking fond memories" },
      appliesTo: ["generic_image"],
      consumerTerms: ["复古风", "怀旧风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:futuristic_scifi",
      version: "0.1.0",
      label: { zh: "未来/科幻", en: "Futuristic / sci-fi" },
      plain: { zh: "未来科幻的氛围，科技感和超前意识", en: "Futuristic sci-fi mood with technological and advanced sensibilities" },
      professionalTerms: ["futuristic", "sci-fi", "technological", "advanced", "space-age"],
      promptFragment: { zh: "未来科幻的氛围，充满科技感和超前意识", en: "futuristic sci-fi atmosphere with advanced technological sensibilities" },
      appliesTo: ["generic_image"],
      consumerTerms: ["科技感", "赛博朋克"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:eerie_horror",
      version: "0.1.0",
      label: { zh: "恐怖/惊悚", en: "Eerie / horror" },
      plain: { zh: "令人不安的恐怖氛围，诡异而毛骨悚然", en: "Unsettling and creepy atmosphere, eerie and disturbing" },
      professionalTerms: ["eerie", "creepy", "unsettling", "horror", "disturbing"],
      promptFragment: { zh: "恐怖惊悚的氛围，诡异不安，令人毛骨悚然", en: "eerie horror atmosphere, creepy and unsettling with disturbing undertones" },
      appliesTo: ["generic_image"],
      consumerTerms: ["暗黑风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:luxurious_premium",
      version: "0.1.0",
      label: { zh: "奢华/高级", en: "Luxurious / premium" },
      plain: { zh: "奢华高级的氛围，精致优雅，高端质感", en: "Luxurious and premium mood with refined elegance and high-end quality" },
      professionalTerms: ["luxurious", "premium", "elegant", "sophisticated", "exclusive"],
      promptFragment: { zh: "奢华高级的氛围，精致优雅，高端质感和格调", en: "luxurious premium atmosphere with refined elegance and exclusive sophistication" },
      appliesTo: ["generic_image"],
      consumerTerms: ["高级感", "奢华感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:wild_natural",
      version: "0.1.0",
      label: { zh: "自然/野性", en: "Wild / natural" },
      plain: { zh: "自然原始的氛围，野性未驯，充满生命力", en: "Wild and natural mood, raw and untamed with primal energy" },
      professionalTerms: ["wild", "natural", "raw", "untamed", "primal"],
      promptFragment: { zh: "自然野性的氛围，原始未驯，充满奔放的生命力", en: "wild natural atmosphere, raw and untamed with primal life force" },
      appliesTo: ["generic_image"],
      consumerTerms: ["自然风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:playful_cute",
      version: "0.1.0",
      label: { zh: "童趣/可爱", en: "Playful / cute" },
      plain: { zh: "童趣可爱的氛围，天真烂漫，轻松有趣", en: "Playful and cute mood, whimsical and childlike with lighthearted fun" },
      professionalTerms: ["playful", "cute", "whimsical", "childlike", "fun"],
      promptFragment: { zh: "童趣可爱的氛围，天真烂漫，轻松有趣", en: "playful cute atmosphere, whimsical and childlike with lighthearted fun" },
      appliesTo: ["generic_image"],
      consumerTerms: ["可爱风", "治愈"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:solemn_dignified",
      version: "0.1.0",
      label: { zh: "庄严/肃穆", en: "Solemn / dignified" },
      plain: { zh: "庄严肃穆的氛围，正式而令人尊敬", en: "Solemn and dignified mood, formal and reverent" },
      professionalTerms: ["solemn", "dignified", "reverent", "formal", "ceremonial"],
      promptFragment: { zh: "庄严肃穆的氛围，正式而令人尊敬，仪式感强烈", en: "solemn dignified atmosphere, formal and reverent with strong ceremonial presence" },
      appliesTo: ["generic_image"],
      consumerTerms: ["高级感", "仪式感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_mood:dynamic_tense",
      version: "0.1.0",
      label: { zh: "动感/紧张", en: "Dynamic / tense" },
      plain: { zh: "充满动感和紧张感的氛围，能量高涨", en: "Dynamic and tense mood with high energy and urgency" },
      professionalTerms: ["dynamic", "tense", "high-energy", "urgent", "thrilling"],
      promptFragment: { zh: "动感紧张的氛围，能量高涨，令人激动", en: "dynamic tense atmosphere with high energy and thrilling urgency" },
      appliesTo: ["generic_image"],
      consumerTerms: ["多巴胺"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
