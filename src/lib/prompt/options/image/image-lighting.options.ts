import type { OptionSet } from "../../types";

export const imageLightingOptions: OptionSet = {
  id: "image_lighting",
  version: "0.1.0",
  label: { zh: "光线", en: "Lighting" },
  categories: [
    {
      id: "cat:image_lighting:natural",
      label: { zh: "自然光", en: "Natural Light" },
      optionIds: [
        "image_lighting:golden_hour", "image_lighting:blue_hour", "image_lighting:midday_harsh",
        "image_lighting:overcast_soft", "image_lighting:morning_mist", "image_lighting:moonlight"
      ]
    },
    {
      id: "cat:image_lighting:artificial",
      label: { zh: "人工光", en: "Artificial Light" },
      optionIds: [
        "image_lighting:window_soft", "image_lighting:studio_clean", "image_lighting:warm_lamp",
        "image_lighting:neon_light", "image_lighting:candlelight", "image_lighting:fluorescent"
      ]
    },
    {
      id: "cat:image_lighting:studio",
      label: { zh: "摄影布光", en: "Studio / Portrait" },
      optionIds: [
        "image_lighting:rembrandt", "image_lighting:butterfly", "image_lighting:split_lighting",
        "image_lighting:loop_lighting", "image_lighting:rim_light", "image_lighting:backlit_silhouette"
      ]
    },
    {
      id: "cat:image_lighting:creative",
      label: { zh: "创意光效", en: "Creative Light Effects" },
      optionIds: [
        "image_lighting:volumetric_god_rays", "image_lighting:cinematic", "image_lighting:soft_dreamy",
        "image_lighting:hard_dramatic", "image_lighting:low_key", "image_lighting:high_key",
        "image_lighting:colored_gel", "image_lighting:laser_beams"
      ]
    }
  ],
  options: [
    // ── Natural Light / Time ──
    {
      id: "image_lighting:golden_hour",
      version: "0.1.0",
      label: { zh: "黄金时刻", en: "Golden hour" },
      plain: { zh: "日出或日落时的温暖金色光线，影子拉长、边缘柔和", en: "Warm golden sunlight at sunrise or sunset, with long soft shadows" },
      professionalTerms: ["golden hour", "warm sunset light", "low angle sun", "soft long shadows"],
      promptFragment: { zh: "黄金时刻的自然光线，温暖的金色光芒，影子拉长柔和", en: "golden hour natural light with warm golden glow and soft elongated shadows" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:blue_hour",
      version: "0.1.0",
      label: { zh: "蓝调时刻", en: "Blue hour" },
      plain: { zh: "日落后或日出前的蓝色调时刻，光线宁静冷调", en: "The cool blue-toned twilight just after sunset or before sunrise, serene and calm" },
      professionalTerms: ["blue hour", "twilight", "dusk", "cool ambient", "serene"],
      promptFragment: { zh: "蓝调时刻的光线，宁静冷色调，暮光氛围", en: "blue hour lighting with cool serene tones and twilight atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:midday_harsh",
      version: "0.1.0",
      label: { zh: "正午强光", en: "Midday harsh light" },
      plain: { zh: "正午阳光直射，光影对比强烈，影子短而深", en: "Direct midday sun with strong contrast and short, deep shadows" },
      professionalTerms: ["midday sun", "harsh noon light", "high contrast", "strong shadows"],
      promptFragment: { zh: "正午强烈日光，高对比度，影子短而清晰", en: "harsh midday sunlight with high contrast and short crisp shadows" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:overcast_soft",
      version: "0.1.0",
      label: { zh: "阴天柔光", en: "Overcast soft light" },
      plain: { zh: "多云或阴天的均匀散射光，几乎无影子，光线柔和平均", en: "Even diffused light from overcast skies, nearly shadowless and uniformly soft" },
      professionalTerms: ["overcast", "soft diffused", "cloudy daylight", "even", "shadowless"],
      promptFragment: { zh: "阴天柔和的散射光，光线均匀，几乎没有明显影子", en: "soft diffused overcast light, evenly lit with barely visible shadows" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:morning_mist",
      version: "0.1.0",
      label: { zh: "清晨薄雾", en: "Morning mist" },
      plain: { zh: "清晨的薄雾光线，空气中弥漫着柔和的散射光", en: "Early morning light filtered through mist, with soft atmospheric diffusion" },
      professionalTerms: ["morning light", "dawn", "misty sunrise", "soft golden mist"],
      promptFragment: { zh: "清晨薄雾中的光线，柔和的散射光穿透雾气", en: "morning light filtering through soft mist with gentle atmospheric diffusion" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:moonlight",
      version: "0.1.0",
      label: { zh: "夜晚/月光", en: "Moonlight / night" },
      plain: { zh: "月光或夜景光线，冷银色调，低照度氛围", en: "Moonlight or night scene with cool silver tones and low-light atmosphere" },
      professionalTerms: ["moonlight", "night scene", "cool low light", "nocturnal", "silver"],
      promptFragment: { zh: "月光下的夜景光线，冷银色调，低照度静谧氛围", en: "moonlit night scene with cool silver tones and a quiet low-light atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Artificial Light / Indoor ──
    {
      id: "image_lighting:window_soft",
      version: "0.1.0",
      label: { zh: "窗边柔光", en: "Window soft light" },
      plain: { zh: "从窗户射入的自然柔光，侧光方向性强", en: "Soft natural light entering through a window, with gentle directional quality" },
      professionalTerms: ["window light", "natural indoor", "side-lit", "soft directional"],
      promptFragment: { zh: "窗边自然柔光，侧光方向温和，营造自然室内氛围", en: "soft window light with gentle directional side-lighting for a natural indoor feel" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:studio_clean",
      version: "0.1.0",
      label: { zh: "影棚光", en: "Studio lighting" },
      plain: { zh: "专业影棚均匀布光，白色背景，光线干净平均", en: "Professional studio lighting with clean white backdrop and even illumination" },
      professionalTerms: ["studio lighting", "clean white", "softbox", "even", "professional"],
      promptFragment: { zh: "专业影棚布光，光线均匀干净，白色背景", en: "professional studio lighting with clean even illumination on a white backdrop" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:warm_lamp",
      version: "0.1.0",
      label: { zh: "暖黄台灯", en: "Warm lamp light" },
      plain: { zh: "暖黄色灯光，营造温馨亲密的室内氛围", en: "Warm tungsten-style lamp light creating a cozy, intimate indoor mood" },
      professionalTerms: ["warm lamp light", "tungsten", "cozy indoor", "orange glow", "intimate"],
      promptFragment: { zh: "暖黄色灯光照射，营造温馨亲密的室内氛围", en: "warm lamp light casting a cozy orange glow for an intimate indoor atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:neon_light",
      version: "0.1.0",
      label: { zh: "霓虹灯光", en: "Neon light" },
      plain: { zh: "彩色霓虹灯管光线，都市夜生活氛围", en: "Colored neon tube light with urban nightlife atmosphere" },
      professionalTerms: ["neon light", "colored artificial", "bar/club", "vibrant", "electric"],
      promptFragment: { zh: "彩色霓虹灯光，充满都市夜生活的活力氛围", en: "vibrant neon light with electric urban nightlife atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:candlelight",
      version: "0.1.0",
      label: { zh: "烛光", en: "Candlelight" },
      plain: { zh: "烛光照明，温暖摇曳，浪漫亲密", en: "Candlelight with warm flickering glow, romantic and intimate" },
      professionalTerms: ["candlelight", "warm flicker", "intimate", "dim", "romantic"],
      promptFragment: { zh: "烛光照明，温暖摇曳的光线营造浪漫亲密氛围", en: "candlelight with warm flickering glow for a romantic intimate mood" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:fluorescent",
      version: "0.1.0",
      label: { zh: "荧光灯", en: "Fluorescent" },
      plain: { zh: "冷白色荧光灯光，办公室或商店常见的平坦照明", en: "Cool white fluorescent light, flat and clinical like offices or stores" },
      professionalTerms: ["fluorescent", "cool white", "office/store", "clinical", "flat"],
      promptFragment: { zh: "荧光灯冷白色照明，光线平坦均匀，类似办公室或商铺", en: "cool white fluorescent lighting, flat and clinical like an office or store" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Studio / Portrait Lighting ──
    {
      id: "image_lighting:rembrandt",
      version: "0.1.0",
      label: { zh: "伦勃朗光", en: "Rembrandt lighting" },
      plain: { zh: "经典人像布光：面部一侧形成三角光斑，戏剧性而优雅", en: "Classic portrait lighting with a triangle of light on the shadow side of the face, dramatic and elegant" },
      professionalTerms: ["Rembrandt lighting", "triangle cheek light", "classic portrait", "dramatic"],
      promptFragment: { zh: "伦勃朗光人像布光，面部三角光斑，经典戏剧性效果", en: "Rembrandt portrait lighting with signature triangle cheek highlight for classic dramatic effect" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "部分模型对复杂布光（如伦勃朗光、蝴蝶光）的还原可能不够精确，建议配合明确的人像主体使用", en: "Complex lighting setups like Rembrandt or butterfly may not render precisely on all models; pair with a clear portrait subject." }
    },
    {
      id: "image_lighting:butterfly",
      version: "0.1.0",
      label: { zh: "蝴蝶光", en: "Butterfly lighting" },
      plain: { zh: "正面高位布光，鼻子下方形成蝴蝶形阴影，常用于时尚/美人照", en: "High frontal lighting creating a butterfly-shaped shadow under the nose, common in fashion and beauty shots" },
      professionalTerms: ["butterfly lighting", "paramount", "glamour", "beauty", "nose shadow"],
      promptFragment: { zh: "蝴蝶光正面高位布光，鼻下蝶形阴影，时尚美人照效果", en: "butterfly lighting with high frontal placement, butterfly shadow under nose for glamour beauty look" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:split_lighting",
      version: "0.1.0",
      label: { zh: "侧光/分割光", en: "Split lighting" },
      plain: { zh: "从侧面照射的光线，将面部一分为二，戏剧性强", en: "Light from the side splitting the face in half, highly dramatic" },
      professionalTerms: ["split lighting", "half-face light", "dramatic", "chiaroscuro", "moody"],
      promptFragment: { zh: "分割光侧光效果，面部一半明亮一半阴影，戏剧性强烈", en: "split lighting with half face illuminated and half in shadow for dramatic effect" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:loop_lighting",
      version: "0.1.0",
      label: { zh: "环形光", en: "Loop lighting" },
      plain: { zh: "经典人像布光，鼻子旁形成小环形阴影，讨喜而自然", en: "Standard portrait lighting with a small loop shadow beside the nose, flattering and natural" },
      professionalTerms: ["loop lighting", "shadow beside nose", "flattering", "portrait standard"],
      promptFragment: { zh: "环形光人像布光，鼻旁小环形阴影，自然而讨喜的效果", en: "loop lighting with a small nose shadow, flattering and natural portrait standard" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:rim_light",
      version: "0.1.0",
      label: { zh: "轮廓光", en: "Rim light" },
      plain: { zh: "从主体后方照射的边缘光，勾勒轮廓，增加立体感", en: "Edge light from behind the subject, outlining the silhouette and adding depth" },
      professionalTerms: ["rim light", "edge light", "backlight", "hair light", "silhouette accent"],
      promptFragment: { zh: "轮廓光从后方照射，勾勒主体边缘，增强立体层次感", en: "rim light from behind outlining the subject's edges for enhanced depth and dimension" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:backlit_silhouette",
      version: "0.1.0",
      label: { zh: "逆光/剪影", en: "Backlit / silhouette" },
      plain: { zh: "主体背对光源，形成剪影效果，充满戏剧性和神秘感", en: "Subject backlit by a strong light source creating a silhouette, dramatic and mysterious" },
      professionalTerms: ["backlit", "contre-jour", "silhouette", "dramatic backlight", "rim"],
      promptFragment: { zh: "逆光剪影效果，主体背对光源形成深色轮廓，戏剧神秘", en: "backlit silhouette with the subject against the light, dramatic and mysterious outline" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Creative Light Effects ──
    {
      id: "image_lighting:volumetric_god_rays",
      version: "0.1.0",
      label: { zh: "体积光/丁达尔", en: "Volumetric / god rays" },
      plain: { zh: "光束穿过空气，可见的光柱效果，充满神圣感", en: "Visible beams of light streaming through the air, atmospheric and ethereal" },
      professionalTerms: ["volumetric lighting", "god rays", "crepuscular", "light beams", "atmospheric"],
      promptFragment: { zh: "体积光效果，可见光束穿过空气，丁达尔效应营造神圣氛围", en: "volumetric lighting with visible god rays streaming through the atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "体积光/丁达尔效应在不同模型上表现差异较大，部分模型可能无法稳定生成该效果", en: "Volumetric lighting and god rays vary significantly between models; some may not render this effect consistently." }
    },
    {
      id: "image_lighting:cinematic",
      version: "0.1.0",
      label: { zh: "电影光", en: "Cinematic lighting" },
      plain: { zh: "电影级布光，富有戏剧性的光影对比和氛围感", en: "Film-grade cinematic lighting with dramatic light-and-shadow contrast and atmosphere" },
      professionalTerms: ["cinematic lighting", "motivated light", "dramatic", "film noir", "Hollywood"],
      promptFragment: { zh: "电影级布光，戏剧性的光影对比，氛围感强烈", en: "cinematic lighting with dramatic contrast and strong atmospheric mood" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:soft_dreamy",
      version: "0.1.0",
      label: { zh: "柔光/梦幻", en: "Soft / dreamy" },
      plain: { zh: "极致柔和的散射光，光晕弥漫，梦幻朦胧", en: "Extremely soft diffused light with a dreamy hazy glow" },
      professionalTerms: ["soft light", "diffused", "dreamy glow", "ethereal", "romantic haze"],
      promptFragment: { zh: "柔光梦幻效果，光晕弥漫，朦胧而浪漫", en: "soft dreamy lighting with a diffused ethereal glow and romantic haze" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:hard_dramatic",
      version: "0.1.0",
      label: { zh: "硬光/对比", en: "Hard / dramatic" },
      plain: { zh: "强烈定向光源，阴影锐利边缘清晰，戏剧张力强", en: "Strong directional light with crisp sharp shadows and dramatic tension" },
      professionalTerms: ["hard light", "crisp shadows", "dramatic contrast", "harsh", "defined"],
      promptFragment: { zh: "硬光强烈对比，阴影锐利清晰，充满戏剧张力", en: "hard dramatic light with crisp sharp shadows and strong contrast" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:low_key",
      version: "0.1.0",
      label: { zh: "低调光", en: "Low-key" },
      plain: { zh: "以暗部为主的照明风格，深邃阴影，神秘感", en: "Predominantly dark lighting with deep shadows, moody and mysterious" },
      professionalTerms: ["low-key lighting", "chiaroscuro", "dark mood", "deep shadows", "mystery"],
      promptFragment: { zh: "低调光效果，以暗部为主，深邃阴影营造神秘氛围", en: "low-key lighting dominated by darkness with deep shadows for a mysterious mood" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:high_key",
      version: "0.1.0",
      label: { zh: "高调光", en: "High-key" },
      plain: { zh: "以亮部为主的照明风格，极少阴影，明亮通透", en: "Predominantly bright lighting with minimal shadows, airy and optimistic" },
      professionalTerms: ["high-key lighting", "bright", "minimal shadow", "airy", "optimistic"],
      promptFragment: { zh: "高调光亮白通透，极少阴影，明亮而充满活力", en: "high-key lighting with bright airy tones and minimal shadows, optimistic feel" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:colored_gel",
      version: "0.1.0",
      label: { zh: "彩色灯光", en: "Colored gel" },
      plain: { zh: "使用彩色滤光片的灯光效果，戏剧化色彩氛围", en: "Lighting with colored gels for theatrical saturated color effects" },
      professionalTerms: ["colored gel lighting", "theatrical", "RGB", "saturated light", "dramatic color"],
      promptFragment: { zh: "彩色灯光效果，戏剧化的色彩氛围，饱和光色", en: "colored gel lighting with theatrical saturated color atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_lighting:laser_beams",
      version: "0.1.0",
      label: { zh: "镭射/激光", en: "Laser / beams" },
      plain: { zh: "激光束光线，演唱会或未来感场景的科技光效", en: "Laser beam light effects for concert-like or futuristic sci-fi atmosphere" },
      professionalTerms: ["laser light", "light beams", "concert", "scanning", "futuristic"],
      promptFragment: { zh: "激光束光线效果，充满科技感和未来氛围", en: "laser beam light effects with a futuristic sci-fi atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
