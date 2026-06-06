import type { OptionSet } from "../../types";

export const imageColorPaletteOptions: OptionSet = {
  id: "image_color_palette",
  version: "0.1.0",
  label: { zh: "色彩方案", en: "Color palette" },
  categories: [
    {
      id: "cat:image_color_palette:warm_cool",
      label: { zh: "冷暖色调", en: "Warm & Cool" },
      optionIds: ["image_color_palette:warm", "image_color_palette:golden_warm", "image_color_palette:neutral_cream", "image_color_palette:cool", "image_color_palette:monochrome", "image_color_palette:monochromatic", "image_color_palette:pastel", "image_color_palette:muted", "image_color_palette:earth_tones", "image_color_palette:sophisticated_gray", "image_color_palette:dark_mode"]
    },
    {
      id: "cat:image_color_palette:vibrant_special",
      label: { zh: "鲜明/特殊", en: "Vibrant & Special" },
      optionIds: ["image_color_palette:vibrant", "image_color_palette:tropical", "image_color_palette:neon", "image_color_palette:jewel_tones", "image_color_palette:botanical_green", "image_color_palette:ocean_blue", "image_color_palette:sunset", "image_color_palette:autumn", "image_color_palette:spring", "image_color_palette:complementary"]
    }
  ],
  options: [
    {
      id: "image_color_palette:warm",
      version: "0.1.0",
      label: { zh: "暖色调", en: "Warm palette" },
      plain: { zh: "金黄、琥珀、橙色等温暖色调", en: "Golden, amber, orange — warm cozy tones" },
      professionalTerms: ["warm colors", "golden tones", "amber", "orange", "cozy"],
      promptFragment: { zh: "暖色调配色，金黄、琥珀和橙色的温暖感受", en: "warm color palette with golden, amber, and orange tones for a cozy feel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["温暖感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:golden_warm",
      version: "0.1.0",
      label: { zh: "金色暖调/暮光", en: "Golden warm" },
      plain: { zh: "金黄暮光般的暖调，琥珀、蜜金，带阳光感", en: "Golden-hour warmth: amber, honeyed gold, sunlit glow" },
      professionalTerms: ["golden hour", "warm gold", "amber", "honeyed", "sunlit"],
      promptFragment: { zh: "金色暖调配色，暮光般的琥珀与蜜金，温暖阳光感", en: "golden warm palette with golden-hour amber and honeyed gold, sunlit warmth" },
      appliesTo: ["generic_image"],
      consumerTerms: ["金色暖调", "暮光", "暖金"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:neutral_cream",
      version: "0.1.0",
      label: { zh: "中性奶油", en: "Neutral cream" },
      plain: { zh: "奶油、裸色、米白等柔和中性色", en: "Cream, nude, beige, off-white — soft neutral tones" },
      professionalTerms: ["neutral", "cream", "nude", "beige", "off-white"],
      promptFragment: { zh: "中性奶油配色，奶油、裸色与米白的柔和高级感", en: "neutral cream palette with cream, nude and off-white for a soft refined look" },
      appliesTo: ["generic_image"],
      consumerTerms: ["奶油色", "中性裸色", "米白"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:tropical",
      version: "0.1.0",
      label: { zh: "热带明快", en: "Tropical" },
      plain: { zh: "热带明快撞色，青绿配橙、明亮饱和", en: "Bright tropical colors: teal-orange, vivid turquoise, saturated" },
      professionalTerms: ["tropical", "teal and orange", "vivid turquoise", "saturated"],
      promptFragment: { zh: "热带明快配色，青绿与橙的明亮撞色，饱和鲜活", en: "tropical palette with bright teal-and-orange contrast, vivid and saturated" },
      appliesTo: ["generic_image"],
      consumerTerms: ["热带", "明快撞色"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:cool",
      version: "0.1.0",
      label: { zh: "冷色调", en: "Cool palette" },
      plain: { zh: "蓝、青、薄荷等清爽冷色调", en: "Blue, cyan, mint — crisp cool tones" },
      professionalTerms: ["cool colors", "blue tones", "teal", "cyan", "crisp"],
      promptFragment: { zh: "冷色调配色，蓝色和青色调的清爽冷静感受", en: "cool color palette with blue and cyan tones for a crisp refreshing feel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["清爽感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:monochrome",
      version: "0.1.0",
      label: { zh: "中性色/黑白", en: "Monochrome / BW" },
      plain: { zh: "黑白或灰度色彩，无彩色", en: "Black and white or grayscale with no color" },
      professionalTerms: ["monochrome", "black and white", "grayscale", "no color"],
      promptFragment: { zh: "黑白单色配色，无彩色参与，纯粹的明度表现", en: "monochrome palette with black and white only, pure luminance expression" },
      appliesTo: ["generic_image"],
      consumerTerms: ["黑白风", "极简风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:monochromatic",
      version: "0.1.0",
      label: { zh: "单色调", en: "Monochromatic" },
      plain: { zh: "同一色系的深浅变化，和谐统一", en: "Variations within a single color family, unified and harmonious" },
      professionalTerms: ["monochromatic", "single color family", "tonal variation", "unified"],
      promptFragment: { zh: "单色调配色，同一色系不同深浅的和谐变化", en: "monochromatic palette with harmonious tonal variations within a single color family" },
      appliesTo: ["generic_image"],
      consumerTerms: ["高级感", "极简风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:pastel",
      version: "0.1.0",
      label: { zh: "柔粉色/少女", en: "Pastel / soft pink" },
      plain: { zh: "柔软的粉色、浅蓝、淡紫等少女感色调", en: "Soft pink, baby blue, light lavender — delicate feminine tones" },
      professionalTerms: ["pastel", "soft pink", "blush", "baby blue", "light", "delicate"],
      promptFragment: { zh: "柔粉色调，浅粉、淡蓝和淡紫色，甜美的少女感受", en: "pastel palette with soft pink, baby blue, and lavender for a sweet delicate feel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["小清新", "可爱风", "少女风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:vibrant",
      version: "0.1.0",
      label: { zh: "鲜艳饱和", en: "Vibrant / saturated" },
      plain: { zh: "高饱和度的鲜艳色彩，充满能量", en: "Highly saturated vivid colors full of energy" },
      professionalTerms: ["vibrant", "saturated", "bold colors", "intense", "vivid"],
      promptFragment: { zh: "高饱和鲜艳配色，充满活力和视觉冲击力", en: "highly saturated vibrant palette full of energy and visual impact" },
      appliesTo: ["generic_image"],
      consumerTerms: ["多巴胺", "潮流"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:muted",
      version: "0.1.0",
      label: { zh: "低调/褪色", en: "Muted / desaturated" },
      plain: { zh: "莫兰迪式的低饱和高级色调", en: "Morandi-style low-saturation refined palette" },
      professionalTerms: ["muted", "desaturated", "faded", "dusty", "understated"],
      promptFragment: { zh: "低饱和莫兰迪配色，柔和内敛的高级色调", en: "muted desaturated palette with soft restrained sophisticated tones" },
      appliesTo: ["generic_image"],
      consumerTerms: ["莫兰迪色", "高级感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:neon",
      version: "0.1.0",
      label: { zh: "霓虹色", en: "Neon" },
      plain: { zh: "荧光般的霓虹灯色，赛博朋克气息", en: "Fluorescent neon colors with cyberpunk vibe" },
      professionalTerms: ["neon palette", "fluorescent", "electric", "bright glow", "cyberpunk"],
      promptFragment: { zh: "霓虹配色，荧光般的电光色，强烈的赛博朋克气息", en: "neon palette with fluorescent electric colors and strong cyberpunk vibe" },
      appliesTo: ["generic_image"],
      consumerTerms: ["赛博朋克", "科技感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:earth_tones",
      version: "0.1.0",
      label: { zh: "大地色", en: "Earth tones" },
      plain: { zh: "陶土、橄榄绿、沙色等自然大地色调", en: "Terracotta, olive, sand — warm natural earth tones" },
      professionalTerms: ["earth tones", "earthy tones", "earthy", "terracotta", "olive", "sand", "natural", "warm"],
      promptFragment: { zh: "大地色系，陶土、橄榄绿和沙色的自然温暖", en: "earth tone palette with terracotta, olive, and sand for natural warmth" },
      appliesTo: ["generic_image"],
      consumerTerms: ["美拉德", "自然风", "大地色", "earthy"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:jewel_tones",
      version: "0.1.0",
      label: { zh: "宝石色", en: "Jewel tones" },
      plain: { zh: "翡翠绿、宝石蓝、红宝石等浓郁的宝石色调", en: "Emerald, sapphire, ruby — rich jewel-toned colors" },
      professionalTerms: ["jewel tones", "emerald", "sapphire", "ruby", "rich", "luxurious"],
      promptFragment: { zh: "宝石色调，翡翠绿、宝石蓝和红宝石色的浓郁奢华", en: "jewel tone palette with emerald, sapphire, and ruby for rich luxury" },
      appliesTo: ["generic_image"],
      consumerTerms: ["奢华感", "高级感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:botanical_green",
      version: "0.1.0",
      label: { zh: "自然绿", en: "Botanical green" },
      plain: { zh: "森林、植物、苔藓等自然绿色", en: "Forest, botanical, moss — verdant natural greens" },
      professionalTerms: ["green palette", "botanical", "forest", "verdant", "fresh"],
      promptFragment: { zh: "自然绿色系，森林和植物的清新绿意", en: "botanical green palette with fresh verdant forest and plant tones" },
      appliesTo: ["generic_image"],
      consumerTerms: ["小清新", "自然风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:ocean_blue",
      version: "0.1.0",
      label: { zh: "海洋蓝", en: "Ocean blue" },
      plain: { zh: "深蓝、水蓝、海军蓝等海洋色调", en: "Navy, aqua, deep blue — maritime ocean tones" },
      professionalTerms: ["ocean palette", "navy", "aqua", "deep blue", "maritime"],
      promptFragment: { zh: "海洋蓝色系，深蓝到水蓝的层次渐变", en: "ocean blue palette with layered gradients from deep navy to aqua" },
      appliesTo: ["generic_image"],
      consumerTerms: ["清爽感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:sunset",
      version: "0.1.0",
      label: { zh: "日落金橙", en: "Sunset palette" },
      plain: { zh: "日落时分的金橙和紫粉色调", en: "Golden-orange and purple-pink of sunset hour" },
      professionalTerms: ["sunset palette", "golden hour", "orange-purple", "warm dusk"],
      promptFragment: { zh: "日落色调，金橙色渐变到紫粉色，温暖黄昏感", en: "sunset palette with golden-orange to purple-pink gradient for warm dusk atmosphere" },
      appliesTo: ["generic_image"],
      consumerTerms: ["氛围感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:autumn",
      version: "0.1.0",
      label: { zh: "秋冬暖棕", en: "Autumn palette" },
      plain: { zh: "焦橙色、酒红、棕色等秋冬温暖色调", en: "Burnt orange, burgundy, brown — cozy autumn warmth" },
      professionalTerms: ["autumn colors", "burnt orange", "burgundy", "brown", "cozy"],
      promptFragment: { zh: "秋冬暖棕色调，焦橙色、酒红色和棕色的温暖层次", en: "autumn warm palette with burnt orange, burgundy, and brown for cozy warmth" },
      appliesTo: ["generic_image"],
      consumerTerms: ["美拉德", "复古风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:spring",
      version: "0.1.0",
      label: { zh: "春夏清新", en: "Spring palette" },
      plain: { zh: "嫩绿、浅粉、天蓝等春夏新生的清新色调", en: "Fresh green, light pink, sky blue — renewal of spring" },
      professionalTerms: ["spring palette", "fresh green", "light pink", "sky blue", "renewal"],
      promptFragment: { zh: "春夏清新色调，嫩绿、浅粉和天蓝色的新生感", en: "spring fresh palette with tender green, light pink, and sky blue for a sense of renewal" },
      appliesTo: ["generic_image"],
      consumerTerms: ["小清新", "治愈"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:sophisticated_gray",
      version: "0.1.0",
      label: { zh: "高级灰", en: "Sophisticated gray" },
      plain: { zh: "不同深浅的灰色，极简高级", en: "Varied grays from greige to charcoal — refined minimal" },
      professionalTerms: ["sophisticated gray", "tonal gray", "greige", "neutral", "refined"],
      promptFragment: { zh: "高级灰色系，不同深浅的灰调，极简而高级", en: "sophisticated gray palette with varied tonal grays for a refined minimalist look" },
      appliesTo: ["generic_image"],
      consumerTerms: ["高级感", "极简风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:complementary",
      version: "0.1.0",
      label: { zh: "互补撞色", en: "Complementary contrast" },
      plain: { zh: "色轮对立的互补色搭配，大胆有冲击力", en: "Opposing complementary colors for bold impactful contrast" },
      professionalTerms: ["complementary colors", "contrasting", "bold pairing", "vibrant"],
      promptFragment: { zh: "互补撞色配色，色轮对立色彩的大胆碰撞", en: "complementary contrast palette with bold clashing colors from opposite sides of the color wheel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["潮流", "多巴胺"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_color_palette:dark_mode",
      version: "0.1.0",
      label: { zh: "暗夜/深色", en: "Dark mode" },
      plain: { zh: "深黑色和暗色的极暗色调", en: "Deep blacks and dark tones for dramatic dark aesthetic" },
      professionalTerms: ["dark mode palette", "deep blacks", "midnight", "moody", "dramatic"],
      promptFragment: { zh: "暗夜深色调，深邃的黑色和暗色，戏剧性的视觉张力", en: "dark mode palette with deep blacks and dark tones for dramatic visual tension" },
      appliesTo: ["generic_image"],
      consumerTerms: ["暗黑风"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
