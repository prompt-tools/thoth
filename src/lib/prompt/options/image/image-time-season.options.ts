import type { OptionSet } from "../../types";

export const imageTimeSeasonOptions: OptionSet = {
  id: "image_time_season",
  version: "0.1.0",
  label: { zh: "时间/季节", en: "Time of day / Season" },
  categories: [
    {
      id: "cat:image_time_season:time",
      label: { zh: "时刻", en: "Time of Day" },
      optionIds: [
        "image_time_season:dawn_morning", "image_time_season:morning", "image_time_season:noon",
        "image_time_season:afternoon", "image_time_season:sunset_dusk", "image_time_season:night",
        "image_time_season:midnight", "image_time_season:golden_hour"
      ]
    },
    {
      id: "cat:image_time_season:season",
      label: { zh: "季节", en: "Season" },
      optionIds: [
        "image_time_season:spring", "image_time_season:summer",
        "image_time_season:autumn", "image_time_season:winter"
      ]
    }
  ],
  options: [
    // ── Time of Day ──
    {
      id: "image_time_season:dawn_morning",
      version: "0.1.0",
      label: { zh: "清晨/黎明", en: "Early morning / dawn" },
      plain: { zh: "太阳刚升起，薄雾弥漫，光线柔和偏冷", en: "Sun just rising with misty atmosphere and soft cool light" },
      professionalTerms: ["dawn", "sunrise", "first light", "early morning", "golden mist"],
      promptFragment: { zh: "清晨时分，天刚亮，薄雾弥漫，光线柔和", en: "early morning at dawn with first light and soft misty atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:morning",
      version: "0.1.0",
      label: { zh: "上午", en: "Morning" },
      plain: { zh: "上午明亮清晰的光线，天空湛蓝", en: "Bright clear morning light with blue skies" },
      professionalTerms: ["morning", "late morning", "bright day", "clear light", "fresh"],
      promptFragment: { zh: "上午时分，阳光明亮，空气清新", en: "morning time with bright sunlight and fresh clear air" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:noon",
      version: "0.1.0",
      label: { zh: "正午", en: "Noon / midday" },
      plain: { zh: "正午阳光当头，光线强烈，影子最短", en: "Sun directly overhead at its brightest with the shortest shadows" },
      professionalTerms: ["noon", "midday", "sun at zenith", "bright overhead", "strong light"],
      promptFragment: { zh: "正午时分，太阳正当头，光线强烈明亮", en: "midday with the sun directly overhead casting bright strong light" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:afternoon",
      version: "0.1.0",
      label: { zh: "下午", en: "Afternoon" },
      plain: { zh: "下午温暖倾斜的阳光，光线开始转为金色", en: "Warm slanting afternoon light beginning to turn golden" },
      professionalTerms: ["afternoon", "late afternoon", "warm slanting light", "golden"],
      promptFragment: { zh: "下午时分，阳光温暖倾斜，开始转为金色", en: "afternoon with warm slanting sunlight beginning to turn golden" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:sunset_dusk",
      version: "0.1.0",
      label: { zh: "黄昏/日落", en: "Sunset / dusk" },
      plain: { zh: "日落时分，天空呈现橙红紫色渐变，氛围浪漫", en: "Sunset with orange-red-purple sky gradient, romantic atmosphere" },
      professionalTerms: ["sunset", "dusk", "twilight", "evening glow", "orange sky"],
      promptFragment: { zh: "黄昏日落时分，天空呈现橙红紫色渐变", en: "sunset at dusk with the sky in orange-red-purple gradient" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:night",
      version: "0.1.0",
      label: { zh: "夜晚", en: "Night" },
      plain: { zh: "夜晚，月光和星光点缀，城市灯光或自然夜景", en: "Nighttime with moonlight and stars, city lights or natural nightscape" },
      professionalTerms: ["night", "nighttime", "dark", "moonlight", "starry", "nocturnal"],
      promptFragment: { zh: "夜晚时分，月光和星光下，夜色静谧", en: "nighttime under moonlight and stars with quiet nocturnal atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:midnight",
      version: "0.1.0",
      label: { zh: "深夜", en: "Midnight" },
      plain: { zh: "深夜最暗的时刻，万籁俱寂", en: "The darkest hour of night, deep silence" },
      professionalTerms: ["midnight", "late night", "darkest hour", "deep night", "silent"],
      promptFragment: { zh: "深夜时分，万籁俱寂，最暗的时刻", en: "midnight at the darkest hour with deep silence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:golden_hour",
      version: "0.1.0",
      label: { zh: "黄金时刻", en: "Golden hour" },
      plain: { zh: "摄影师最爱的时刻——日出后或日落前的温暖金光", en: "The photographer's favorite time — warm golden light just after sunrise or before sunset" },
      professionalTerms: ["golden hour", "warm sunset light", "long shadows", "magical light", "photographer's hour"],
      promptFragment: { zh: "黄金时刻，温暖的金色光芒洒满画面", en: "golden hour with warm magical light casting long shadows across the scene" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Season ──
    {
      id: "image_time_season:spring",
      version: "0.1.0",
      label: { zh: "春天", en: "Spring" },
      plain: { zh: "春天，万物复苏，鲜花盛开，嫩绿新叶", en: "Spring with cherry blossoms, fresh green leaves, and renewal" },
      professionalTerms: ["spring", "cherry blossoms", "fresh green", "renewal", "blooming"],
      promptFragment: { zh: "春天，鲜花盛开，嫩绿新叶，万物复苏", en: "springtime with blooming flowers, fresh green leaves, and renewal" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:summer",
      version: "0.1.0",
      label: { zh: "夏天", en: "Summer" },
      plain: { zh: "夏天，阳光灿烂，绿意盎然，充满活力", en: "Summer with bright sun, lush greenery, and vibrant energy" },
      professionalTerms: ["summer", "bright sun", "vibrant", "hot", "lush", "energetic"],
      promptFragment: { zh: "夏天，阳光灿烂，绿意盎然，充满活力", en: "summertime with bright sunshine, lush greenery, and vibrant energy" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:autumn",
      version: "0.1.0",
      label: { zh: "秋天", en: "Autumn" },
      plain: { zh: "秋天，金色红叶，丰收季节，温暖色调", en: "Autumn with golden-red leaves, harvest season, and warm tones" },
      professionalTerms: ["autumn", "fall colors", "golden leaves", "harvest", "warm tones"],
      promptFragment: { zh: "秋天，金黄红叶，丰收的季节，温暖色调", en: "autumn with golden-red leaves, harvest season, and warm earthy tones" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_time_season:winter",
      version: "0.1.0",
      label: { zh: "冬天", en: "Winter" },
      plain: { zh: "冬天，白雪覆盖，枯树冰霜，银色世界", en: "Winter with snow-covered landscapes, bare trees, and frost" },
      professionalTerms: ["winter", "snow", "bare trees", "cold", "frost", "white landscape"],
      promptFragment: { zh: "冬天，白雪覆盖，枯树冰霜，银白世界", en: "winter with snow-covered ground, bare frosty trees, and a white landscape" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
