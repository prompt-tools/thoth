import type { OptionSet } from "../../types";

export const imageArtStyleOptions: OptionSet = {
  id: "image_art_style",
  version: "0.1.0",
  label: { zh: "艺术风格", en: "Art style" },
  categories: [
    {
      id: "cat:image_art_style:art_medium",
      label: { zh: "艺术形式", en: "Art medium / Technique" },
      optionIds: [
        "image_art_style:photorealistic", "image_art_style:oil_painting", "image_art_style:ink_wash",
        "image_art_style:watercolor", "image_art_style:pencil_sketch", "image_art_style:acrylic_impasto",
        "image_art_style:digital_painting", "image_art_style:vector_flat", "image_art_style:3d_render",
        "image_art_style:pixel_art", "image_art_style:line_art", "image_art_style:woodcut_print",
        "image_art_style:collage", "image_art_style:marker_drawing", "image_art_style:pastel_drawing",
        "image_art_style:graffiti", "image_art_style:claymation", "image_art_style:paper_cut",
        "image_art_style:embroidery", "image_art_style:mosaic"
      ]
    },
    {
      id: "cat:image_art_style:aesthetic_movement",
      label: { zh: "美学流派", en: "Aesthetic / Movement" },
      optionIds: [
        "image_art_style:minimalist", "image_art_style:vintage_retro", "image_art_style:cyberpunk",
        "image_art_style:synthwave",
        "image_art_style:steampunk", "image_art_style:anime_manga", "image_art_style:korean_manhwa",
        "image_art_style:american_comic", "image_art_style:guochao", "image_art_style:gothic_dark",
        "image_art_style:pop_art", "image_art_style:surrealism", "image_art_style:abstract",
        "image_art_style:impressionism",
        "image_art_style:baroque", "image_art_style:art_deco", "image_art_style:ukiyoe",
        "image_art_style:bauhaus", "image_art_style:memphis", "image_art_style:acid_graphics",
        "image_art_style:glitch_art", "image_art_style:modern_chinese",
        "image_art_style:mandala"
      ]
    },
    {
      id: "cat:image_art_style:photography_genre",
      label: { zh: "摄影类型", en: "Photography genre" },
      optionIds: [
        "image_art_style:fashion_photography", "image_art_style:product_photography",
        "image_art_style:food_photography", "image_art_style:portrait_photography",
        "image_art_style:street_photography", "image_art_style:architectural_photography",
        "image_art_style:macro_photography", "image_art_style:aerial_photography",
        "image_art_style:documentary_photography", "image_art_style:film_photography"
      ]
    },
    {
      id: "cat:image_art_style:3d_style",
      label: { zh: "3D风格", en: "3D rendering style" },
      optionIds: [
        "image_art_style:photorealistic_render", "image_art_style:cartoon_3d",
        "image_art_style:low_poly", "image_art_style:clay_3d", "image_art_style:isometric",
        "image_art_style:voxel", "image_art_style:clay_white_render",
        "image_art_style:glass_render", "image_art_style:metallic_render",
        "image_art_style:neon_glow_render"
      ]
    }
  ],
  options: [
    // ═══ 3A: Art Medium / Technique (20 options) ═══
    {
      id: "image_art_style:photorealistic",
      version: "0.1.0",
      label: { zh: "照片级写实", en: "Photorealistic" },
      plain: { zh: "像真实照片一样的超高精度渲染，细节丰富", en: "Ultra-high precision rendering that looks like a real photograph" },
      professionalTerms: ["photorealistic", "hyperrealistic", "photographic", "realistic render"],
      promptFragment: { zh: "照片级写实风格，超高精度的画面细节和真实光影", en: "photorealistic style with ultra-high precision detail and realistic lighting" },
      appliesTo: ["generic_image"],
      consumerTerms: ["写实风", "照片级"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:oil_painting",
      version: "0.1.0",
      label: { zh: "油画风", en: "Oil painting" },
      plain: { zh: "像古典油画一样，能看到明显的笔触纹理和厚重颜料的质感", en: "Classical oil painting with visible brushstroke texture and thick paint impasto" },
      professionalTerms: ["oil painting", "impasto", "oil on canvas", "thick textured paint"],
      promptFragment: { zh: "油画风格，厚重的颜料笔触，画布纹理可见，古典艺术质感", en: "oil painting style with thick impasto brushstrokes, visible canvas texture, and classical artistic quality" },
      appliesTo: ["generic_image"],
      consumerTerms: ["油画风", "厚涂"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:ink_wash",
      version: "0.1.0",
      label: { zh: "水墨风", en: "Ink wash" },
      plain: { zh: "中国传统水墨画效果，浓淡干湿的墨色变化", en: "Traditional Chinese ink wash painting with varying ink density and dry/wet effects" },
      professionalTerms: ["ink wash painting", "sumi-e", "Chinese ink", "brush painting", "monochrome wash"],
      promptFragment: { zh: "水墨画风格，浓淡变化的墨色，留白和笔触韵味", en: "Chinese ink wash painting style with rich tonal variation, intentional empty space, and expressive brushwork" },
      appliesTo: ["generic_image"],
      consumerTerms: ["水墨风", "国风", "新中式", "留白"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:watercolor",
      version: "0.1.0",
      label: { zh: "水彩风", en: "Watercolor" },
      plain: { zh: "清新透气的水彩效果，颜色透明柔和，边缘自然晕染", en: "Fresh, airy watercolor with transparent, soft colors and natural edge bleeding" },
      professionalTerms: ["watercolor", "wet-on-wet", "wash", "transparent color", "soft edges"],
      promptFragment: { zh: "水彩风格，透明的色彩层叠，柔和的边缘晕染，画面清新透气", en: "watercolor style with transparent layered washes, soft edge bleeding, and a fresh, airy feel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["水彩风", "薄涂"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:pencil_sketch",
      version: "0.1.0",
      label: { zh: "素描风", en: "Pencil sketch" },
      plain: { zh: "铅笔或炭笔手绘效果，线条和阴影为主", en: "Pencil or charcoal hand-drawn effect with emphasis on lines and shading" },
      professionalTerms: ["pencil sketch", "charcoal drawing", "graphite", "hand-drawn", "sketchy"],
      promptFragment: { zh: "素描风格，铅笔或炭笔线条为主，明暗通过排线表现", en: "pencil sketch style with graphite or charcoal lines, shading through hatching" },
      appliesTo: ["generic_image"],
      consumerTerms: ["手绘感", "素描风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:acrylic_impasto",
      version: "0.1.0",
      label: { zh: "丙烯/厚涂", en: "Acrylic / Impasto" },
      plain: { zh: "鲜艳厚重的丙烯颜料，大胆的笔触和强烈的质感", en: "Bright, heavy acrylic paint with bold strokes and strong texture" },
      professionalTerms: ["acrylic painting", "impasto", "thick paint", "bold strokes", "heavy texture"],
      promptFragment: { zh: "丙烯画风格，鲜艳厚重的色彩，大胆粗犷的笔触，强烈的肌理感", en: "acrylic painting style with vibrant heavy colors, bold expressive strokes, and strong textural quality" },
      appliesTo: ["generic_image"],
      consumerTerms: ["厚涂", "质感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:digital_painting",
      version: "0.1.0",
      label: { zh: "数字绘画", en: "Digital painting" },
      plain: { zh: "电脑CG绘画效果，干净的光影和色彩过渡", en: "Computer CG art with clean lighting, shadow, and color transitions" },
      professionalTerms: ["digital painting", "CG art", "digital illustration", "Photoshop art", "clean CG"],
      promptFragment: { zh: "数字绘画风格，干净的光影过渡，丰富的色彩层次", en: "digital painting style with smooth light-shadow transitions and rich color layers" },
      appliesTo: ["generic_image"],
      consumerTerms: ["插画风", "CG风", "数字绘画"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:vector_flat",
      version: "0.1.0",
      label: { zh: "矢量/扁平风", en: "Vector / Flat" },
      plain: { zh: "无渐变、纯色块的扁平矢量风格，几何感和秩序感强", en: "Flat vector art with solid colors, no gradients, strong geometric order" },
      professionalTerms: ["vector art", "flat design", "geometric", "solid colors", "no gradient"],
      promptFragment: { zh: "扁平矢量风格，纯色块面，无渐变，几何化和极简的表达", en: "flat vector style with solid color blocks, no gradients, geometric and minimalist expression" },
      appliesTo: ["generic_image"],
      consumerTerms: ["扁平风", "极简风", "矢量风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:3d_render",
      version: "0.1.0",
      label: { zh: "3D渲染", en: "3D render" },
      plain: { zh: "三维软件渲染效果，有体积感和材质感", en: "3D software rendered look with volume and material quality" },
      professionalTerms: ["3D render", "CGI", "3D modeled", "computer generated", "rendered"],
      promptFragment: { zh: "3D渲染风格，具有三维体积感和材质表现", en: "3D rendered style with three-dimensional volume and material representation" },
      appliesTo: ["generic_image"],
      consumerTerms: ["3D渲染", "C4D风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:pixel_art",
      version: "0.1.0",
      label: { zh: "像素风", en: "Pixel art" },
      plain: { zh: "复古游戏的像素化画面，由可见的方块像素组成", en: "Retro game pixelated visuals composed of visible block pixels" },
      professionalTerms: ["pixel art", "8-bit", "16-bit", "retro game", "blocky", "low-res"],
      promptFragment: { zh: "像素艺术风格，可见的方块像素点阵，复古游戏画面质感", en: "pixel art style with visible blocky pixel grids and retro game aesthetic" },
      appliesTo: ["generic_image"],
      consumerTerms: ["像素风", "8-bit"],
      riskHint: { zh: "像素艺术在部分模型上可能被误解为低画质输出，建议明确提示\"pixel art style\"", en: "Pixel art may be misinterpreted as low quality; explicitly prompt 'pixel art style'." }
    },
    {
      id: "image_art_style:line_art",
      version: "0.1.0",
      label: { zh: "线稿/白描", en: "Line art" },
      plain: { zh: "干净的线条勾勒轮廓，不上色或极少上色", en: "Clean outline drawing with minimal or no color fill" },
      professionalTerms: ["line art", "line drawing", "clean lines", "outline", "no fill", "minimalist"],
      promptFragment: { zh: "线稿风格，干净的轮廓线条，无填充或极少上色", en: "line art style with clean outline strokes and minimal or no color fill" },
      appliesTo: ["generic_image"],
      consumerTerms: ["手绘感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:woodcut_print",
      version: "0.1.0",
      label: { zh: "版画", en: "Woodcut print" },
      plain: { zh: "木刻版画的粗犷线条和强烈黑白对比", en: "Woodcut print with bold rough lines and strong black-white contrast" },
      professionalTerms: ["woodcut print", "linocut", "etching", "relief print", "bold lines"],
      promptFragment: { zh: "版画风格，粗犷的刻痕线条，强烈的黑白对比", en: "woodcut print style with bold carved lines and strong monochrome contrast" },
      appliesTo: ["generic_image"],
      consumerTerms: ["版画风", "手工感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:collage",
      version: "0.1.0",
      label: { zh: "拼贴风", en: "Collage" },
      plain: { zh: "多种素材剪贴组合，不同质感和来源的元素混合", en: "Mixed-media cutout collage with varied textures and source elements" },
      professionalTerms: ["collage", "mixed media", "paper cut", "assembled", "layered cutout"],
      promptFragment: { zh: "拼贴风格，不同材质和来源的元素剪贴组合，层次丰富", en: "collage style with diverse materials and sourced elements cut and assembled in rich layers" },
      appliesTo: ["generic_image"],
      consumerTerms: ["拼贴风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:marker_drawing",
      version: "0.1.0",
      label: { zh: "马克笔/手绘", en: "Marker drawing" },
      plain: { zh: "马克笔手绘效果，鲜艳的色彩和清晰的笔触", en: "Marker art with vibrant colors and visible stroke marks" },
      professionalTerms: ["marker art", "hand-drawn", "sketchy", "illustration", "vibrant markers"],
      promptFragment: { zh: "马克笔手绘风格，鲜艳的色彩和可见的笔触痕迹", en: "marker drawing style with vibrant colors and visible stroke marks" },
      appliesTo: ["generic_image"],
      consumerTerms: ["手绘感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:pastel_drawing",
      version: "0.1.0",
      label: { zh: "粉彩/色粉", en: "Pastel drawing" },
      plain: { zh: "柔和粉质的笔触效果，颜色温柔朦胧", en: "Soft powdery strokes with gentle, hazy colors" },
      professionalTerms: ["pastel drawing", "chalk art", "soft pastel", "powdery", "delicate"],
      promptFragment: { zh: "粉彩画风格，柔和的粉质笔触，色彩温柔朦胧", en: "pastel drawing style with soft powdery strokes and gentle hazy colors" },
      appliesTo: ["generic_image"],
      consumerTerms: ["粉彩风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:graffiti",
      version: "0.1.0",
      label: { zh: "涂鸦/街头", en: "Graffiti / Street" },
      plain: { zh: "街头涂鸦风格，喷漆效果，大胆张扬", en: "Street graffiti with spray paint effects, bold and expressive" },
      professionalTerms: ["graffiti", "street art", "spray paint", "urban art", "bold"],
      promptFragment: { zh: "街头涂鸦风格，喷漆效果，大胆张扬的视觉表达", en: "street graffiti style with spray paint effects and bold, expressive visual language" },
      appliesTo: ["generic_image"],
      consumerTerms: ["街头风", "潮流"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:claymation",
      version: "0.1.0",
      label: { zh: "黏土/手工", en: "Claymation" },
      plain: { zh: "黏土动画质感，手工感强，圆润可爱", en: "Claymation texture with strong handcrafted feel, rounded and cute" },
      professionalTerms: ["claymation", "plasticine", "stop-motion", "clay-like", "handcrafted"],
      promptFragment: { zh: "黏土动画风格，塑形手工质感，圆润可爱的造型", en: "claymation style with sculpted handcrafted texture and rounded, cute forms" },
      appliesTo: ["generic_image"],
      consumerTerms: ["黏土风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:paper_cut",
      version: "0.1.0",
      label: { zh: "剪纸风", en: "Paper cut" },
      plain: { zh: "传统剪纸艺术效果，层叠的纸片和镂空", en: "Traditional paper cut art with layered paper and cutout holes" },
      professionalTerms: ["paper cut art", "kirigami", "layered paper", "silhouette cutout", "folk art"],
      promptFragment: { zh: "剪纸风格，层叠的纸片和镂空图案，传统民间艺术质感", en: "paper cut style with layered sheets and cutout patterns, traditional folk art texture" },
      appliesTo: ["generic_image"],
      consumerTerms: ["剪纸风", "国风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:embroidery",
      version: "0.1.0",
      label: { zh: "刺绣风", en: "Embroidery" },
      plain: { zh: "刺绣纹理效果，线迹和针脚可见", en: "Embroidery texture with visible thread stitches" },
      professionalTerms: ["embroidery art", "thread art", "stitched", "textile", "needlework"],
      promptFragment: { zh: "刺绣风格，线迹和针脚纹理可见，类似纺织品质感", en: "embroidery style with visible thread stitches and needle marks, textile-like texture" },
      appliesTo: ["generic_image"],
      consumerTerms: ["刺绣风", "国风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:mosaic",
      version: "0.1.0",
      label: { zh: "马赛克", en: "Mosaic" },
      plain: { zh: "由小块碎片拼成的马赛克图案", en: "Mosaic pattern composed of small fragmented tiles" },
      professionalTerms: ["mosaic", "tessellation", "tile art", "fragmented", "small pieces"],
      promptFragment: { zh: "马赛克风格，由碎片化的小块拼合而成", en: "mosaic style composed of small fragmented tile pieces" },
      appliesTo: ["generic_image"],
      consumerTerms: ["马赛克风"],
      riskHint: { zh: "", en: "" }
    },
    // ═══ 3B: Aesthetic / Movement (20 options) ═══
    {
      id: "image_art_style:minimalist",
      version: "0.1.0",
      label: { zh: "极简风", en: "Minimalist" },
      plain: { zh: "极度精简的画面，只保留必要的视觉元素", en: "Extremely simplified visuals with only essential elements" },
      professionalTerms: ["minimalist", "Bauhaus", "less-is-more", "essential", "reduced", "clean"],
      promptFragment: { zh: "极简风格，画面极简克制，只保留最核心的视觉元素", en: "minimalist style with restrained, simplified visuals keeping only essential elements" },
      appliesTo: ["generic_image"],
      consumerTerms: ["极简风", "高级感", "干净"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:vintage_retro",
      version: "0.1.0",
      label: { zh: "复古/怀旧", en: "Vintage / Retro" },
      plain: { zh: "老照片、旧海报的怀旧质感，褪色和岁月痕迹", en: "Old photo/poster aesthetic with fading and age marks" },
      professionalTerms: ["vintage", "retro", "nostalgic", "old-school", "film look", "antique"],
      promptFragment: { zh: "复古怀旧风格，褪色调的胶片质感，旧日时光的氛围", en: "vintage retro style with faded film tones and nostalgic atmosphere" },
      appliesTo: ["generic_image"],
      consumerTerms: ["复古风", "怀旧风", "胶片感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:cyberpunk",
      version: "0.1.0",
      label: { zh: "赛博朋克", en: "Cyberpunk" },
      plain: { zh: "高科技低生活的未来都市，霓虹灯和雨夜街道", en: "High-tech low-life future city with neon lights and rain-slicked streets" },
      professionalTerms: ["cyberpunk", "neon-noir", "high-tech low-life", "futuristic dystopian", "rain-slicked"],
      promptFragment: { zh: "赛博朋克风格，霓虹灯光的未来都市，雨夜街道，高科技低生活的视觉冲突", en: "cyberpunk style with neon-lit futuristic city, rain-slicked streets, and high-tech low-life visual contrast" },
      appliesTo: ["generic_image"],
      consumerTerms: ["赛博朋克", "科技感", "未来感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:synthwave",
      version: "0.1.0",
      label: { zh: "合成波/蒸汽波", en: "Synthwave / Vaporwave" },
      plain: { zh: "80年代霓虹复古未来感，粉紫蓝渐变、网格、落日", en: "80s neon-retro futurism: magenta-purple-cyan gradients, grids, sunset" },
      professionalTerms: ["synthwave", "vaporwave", "retrowave", "outrun", "80s neon", "chrome gradient"],
      promptFragment: { zh: "蒸汽波/合成波风格，80年代霓虹复古未来感，粉紫蓝渐变、网格地平线与落日", en: "synthwave/vaporwave style with 80s neon-retro futurism, magenta-purple-cyan gradients, grid horizon and sunset" },
      appliesTo: ["generic_image"],
      consumerTerms: ["蒸汽波", "赛博怀旧", "80年代霓虹"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:steampunk",
      version: "0.1.0",
      label: { zh: "蒸汽朋克", en: "Steampunk" },
      plain: { zh: "维多利亚时代的蒸汽机械幻想世界", en: "Victorian-era steam-powered mechanical fantasy world" },
      professionalTerms: ["steampunk", "Victorian sci-fi", "brass and gears", "retro-futuristic", "industrial"],
      promptFragment: { zh: "蒸汽朋克风格，维多利亚时代的黄铜齿轮和蒸汽机械的幻想世界", en: "steampunk style with Victorian brass gears and steam machinery in a retro-futuristic fantasy world" },
      appliesTo: ["generic_image"],
      consumerTerms: ["蒸汽朋克", "复古"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:anime_manga",
      version: "0.1.0",
      label: { zh: "日系/二次元", en: "Anime / Manga" },
      plain: { zh: "日本动画和漫画的赛璐璐着色风格", en: "Japanese animation and manga cel-shaded art style" },
      professionalTerms: ["anime style", "manga", "Japanese animation", "cel-shaded", "2D Japanese"],
      promptFragment: { zh: "日系动画风格，赛璐璐着色，日本动漫画面质感", en: "Japanese anime style with cel-shaded coloring and authentic manga aesthetic" },
      appliesTo: ["generic_image"],
      consumerTerms: ["二次元", "日系", "动漫风"],
      riskHint: { zh: "日系风格在不同模型上表现差异较大，Midjourney 的 --niji 模式效果最佳", en: "Anime style output varies significantly between models; Midjourney --niji mode produces the best results." }
    },
    {
      id: "image_art_style:korean_manhwa",
      version: "0.1.0",
      label: { zh: "韩系", en: "Korean manhwa" },
      plain: { zh: "韩国网络漫画的精美画风，柔和的阴影和细腻的线条", en: "Korean webtoon art with soft shading and delicate linework" },
      professionalTerms: ["Korean manhwa style", "K-beauty aesthetic", "webtoon", "soft shading"],
      promptFragment: { zh: "韩系漫画风格，柔和的阴影过渡，精致的面部描绘", en: "Korean manhwa style with soft shading transitions and refined facial rendering" },
      appliesTo: ["generic_image"],
      consumerTerms: ["韩系", "韩漫风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:american_comic",
      version: "0.1.0",
      label: { zh: "美式漫画", en: "American comic" },
      plain: { zh: "美式超级英雄漫画风格，粗线条和网点", en: "American superhero comic style with bold inks and halftone dots" },
      professionalTerms: ["comic book style", "American comics", "Marvel/DC", "bold inks", "halftone dots"],
      promptFragment: { zh: "美式漫画风格，粗犷的墨线和网点印刷效果", en: "American comic book style with bold ink lines and halftone dot printing effect" },
      appliesTo: ["generic_image"],
      consumerTerms: ["美漫风", "漫画风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:guochao",
      version: "0.1.0",
      label: { zh: "国潮风", en: "Guochao" },
      plain: { zh: "中国传统元素与现代设计的融合，红金配色醒目", en: "Fusion of traditional Chinese elements with modern design, bold red and gold" },
      professionalTerms: ["Chinese neo-traditional", "guochao", "modern Chinese cultural", "bold red/gold"],
      promptFragment: { zh: "国潮风格，中国传统元素与现代设计融合，醒目的红金配色", en: "guochao style blending traditional Chinese motifs with modern design and bold red-gold palette" },
      appliesTo: ["generic_image"],
      consumerTerms: ["国潮风", "新中式", "国风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:gothic_dark",
      version: "0.1.0",
      label: { zh: "哥特/暗黑", en: "Gothic / Dark" },
      plain: { zh: "阴沉华丽的哥特美学，黑暗浪漫", en: "Somber ornate gothic aesthetic, dark romanticism" },
      professionalTerms: ["gothic", "dark aesthetic", "moody", "ornate shadows", "romantic darkness"],
      promptFragment: { zh: "哥特暗黑风格，阴沉华丽的暗色美学，黑暗浪漫的氛围", en: "gothic dark style with somber ornate aesthetics and dark romantic atmosphere" },
      appliesTo: ["generic_image"],
      consumerTerms: ["暗黑风", "哥特风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:pop_art",
      version: "0.1.0",
      label: { zh: "波普艺术", en: "Pop art" },
      plain: { zh: "安迪-沃霍尔式的波普艺术，大胆配色和重复图案", en: "Warhol-style pop art with bold colors and repeating patterns" },
      professionalTerms: ["pop art", "Warhol style", "comic dots", "bold colors", "popular culture"],
      promptFragment: { zh: "波普艺术风格，大胆的鲜艳配色，重复图案和流行文化元素", en: "pop art style with bold vibrant colors, repeating patterns, and popular culture references" },
      appliesTo: ["generic_image"],
      consumerTerms: ["波普风", "波普艺术"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:surrealism",
      version: "0.1.0",
      label: { zh: "超现实", en: "Surrealism" },
      plain: { zh: "梦境般的超现实场景，现实被扭曲和重组", en: "Dreamlike surreal scenes where reality is distorted and recombined" },
      professionalTerms: ["surrealism", "dreamlike", "Dali-esque", "reality-bending", "impossible"],
      promptFragment: { zh: "超现实主义风格，梦境般的场景，现实元素被扭曲和重组", en: "surrealist style with dreamlike scenes where reality is distorted and recombined" },
      appliesTo: ["generic_image"],
      consumerTerms: ["超现实", "梦幻"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:abstract",
      version: "0.1.0",
      label: { zh: "抽象", en: "Abstract" },
      plain: { zh: "非具象的抽象艺术，用色彩、形状、笔触和肌理传达感觉，而不是描绘具体实物", en: "Non-representational abstract art conveying feeling through color, shape, gesture and texture rather than depicting concrete objects" },
      professionalTerms: ["abstract art", "non-representational", "abstract expressionism", "gestural", "color field"],
      promptFragment: { zh: "抽象艺术风格，非具象，以色彩、形状与肌理为主，强调构成与情绪而非具体物体", en: "abstract art style, non-representational, emphasizing color, shape and texture, with composition and mood over concrete subject" },
      appliesTo: ["generic_image"],
      consumerTerms: ["抽象", "抽象画"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:impressionism",
      version: "0.1.0",
      label: { zh: "印象派", en: "Impressionism" },
      plain: { zh: "莫奈式的印象派，可见的松散笔触和光影表现", en: "Monet-style impressionism with visible loose brushstrokes and light expression" },
      professionalTerms: ["impressionism", "Monet style", "visible brushstrokes", "light over detail", "soft"],
      promptFragment: { zh: "印象派风格，松散的可见笔触，以光影氛围优先于细节", en: "impressionist style with loose visible brushstrokes, prioritizing light and atmosphere over detail" },
      appliesTo: ["generic_image"],
      consumerTerms: ["莫奈风", "印象派"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:baroque",
      version: "0.1.0",
      label: { zh: "巴洛克", en: "Baroque" },
      plain: { zh: "富丽堂皇的巴洛克风格，强烈的明暗对比和戏剧性", en: "Ornate baroque style with dramatic chiaroscuro and theatrical grandeur" },
      professionalTerms: ["baroque", "ornate", "dramatic light", "grand", "decorative", "chiaroscuro"],
      promptFragment: { zh: "巴洛克风格，华丽繁复的装饰，强烈的戏剧性光影", en: "baroque style with opulent ornamentation and dramatic theatrical lighting" },
      appliesTo: ["generic_image"],
      consumerTerms: ["奢华感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:art_deco",
      version: "0.1.0",
      label: { zh: "装饰艺术", en: "Art Deco" },
      plain: { zh: "1920年代的装饰艺术，几何线条和奢华金属色", en: "1920s Art Deco with geometric lines and luxurious metallic colors" },
      professionalTerms: ["art deco", "Gatsby style", "geometric luxury", "1920s elegance", "metallic"],
      promptFragment: { zh: "装饰艺术风格，几何线条，奢华金属色调，20年代的优雅", en: "Art Deco style with geometric lines, luxurious metallic tones, and 1920s elegance" },
      appliesTo: ["generic_image"],
      consumerTerms: ["高级感", "奢华感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:ukiyoe",
      version: "0.1.0",
      label: { zh: "浮世绘", en: "Ukiyo-e" },
      plain: { zh: "日本浮世绘木板画风格，平涂色彩和装饰性线条", en: "Japanese ukiyo-e woodblock print style with flat colors and decorative lines" },
      professionalTerms: ["ukiyo-e", "Japanese woodblock", "traditional Japanese print", "flat color"],
      promptFragment: { zh: "浮世绘风格，平涂的色彩，装饰性的轮廓线条", en: "ukiyo-e style with flat color areas and decorative contour lines" },
      appliesTo: ["generic_image"],
      consumerTerms: ["浮世绘", "日系"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:bauhaus",
      version: "0.1.0",
      label: { zh: "包豪斯", en: "Bauhaus" },
      plain: { zh: "包豪斯功能主义美学，几何色块和三原色", en: "Bauhaus functionalist aesthetic with geometric blocks and primary colors" },
      professionalTerms: ["Bauhaus", "functionalist", "geometric", "form follows function", "primary colors"],
      promptFragment: { zh: "包豪斯风格，功能主义几何造型，红黄蓝三原色色块", en: "Bauhaus style with functionalist geometry and red-yellow-blue primary color blocks" },
      appliesTo: ["generic_image"],
      consumerTerms: ["极简风", "包豪斯"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:memphis",
      version: "0.1.0",
      label: { zh: "孟菲斯风", en: "Memphis" },
      plain: { zh: "80年代后现代的孟菲斯设计，波点和几何乱中有序", en: "80s postmodern Memphis design with playful dots and geometry" },
      professionalTerms: ["Memphis design", "80s postmodern", "bold patterns", "playful shapes", "clashing colors"],
      promptFragment: { zh: "孟菲斯风格，80年代后现代设计，波点、几何和冲突色彩", en: "Memphis style with 80s postmodern design, dots, geometry, and clashing colors" },
      appliesTo: ["generic_image"],
      consumerTerms: ["孟菲斯风", "80s风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:acid_graphics",
      version: "0.1.0",
      label: { zh: "酸性设计", en: "Acid graphics" },
      plain: { zh: "液态金属感、迷幻色彩和Y2K美学结合的酸性设计", en: "Liquid metal, psychedelic colors, and Y2K aesthetic combined" },
      professionalTerms: ["acid graphics", "Y2K aesthetic", "liquid metal", "psychedelic", "metallic fluid"],
      promptFragment: { zh: "酸性设计风格，液态金属质感，迷幻色彩和Y2K美学", en: "acid graphics style with liquid metal textures, psychedelic colors, and Y2K aesthetic" },
      appliesTo: ["generic_image"],
      consumerTerms: ["酸性设计", "Y2K风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:glitch_art",
      version: "0.1.0",
      label: { zh: "故障艺术", en: "Glitch art" },
      plain: { zh: "数字故障、信号干扰效果，像素偏移和色彩分离", en: "Digital corruption, signal interference, pixel shift, and color separation" },
      professionalTerms: ["glitch art", "datamosh", "digital corruption", "visual errors", "distorted"],
      promptFragment: { zh: "故障艺术风格，数字信号干扰效果，像素偏移和色彩分离", en: "glitch art style with digital signal interference, pixel shifting, and color separation" },
      appliesTo: ["generic_image"],
      consumerTerms: ["故障风", "赛博朋克"],
      riskHint: { zh: "并非所有模型都稳定支持故障艺术效果，建议在主流模型上测试", en: "Glitch art effects are not consistently supported across all models; test on mainstream models first." }
    },
    {
      id: "image_art_style:modern_chinese",
      version: "0.1.0",
      label: { zh: "新中式", en: "Modern Chinese" },
      plain: { zh: "将中国传统美学用现代简约手法表达", en: "Traditional Chinese aesthetics expressed through modern minimalist approach" },
      professionalTerms: ["modern Chinese", "new Chinese style", "contemporary Chinese", "refined tradition"],
      promptFragment: { zh: "新中式风格，中国传统美学的现代表达，简约而有韵味", en: "modern Chinese style with traditional aesthetics in contemporary minimalist expression" },
      appliesTo: ["generic_image"],
      consumerTerms: ["新中式", "国风", "高级感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:mandala",
      version: "0.1.0",
      label: { zh: "曼陀罗/神圣几何", en: "Mandala / sacred geometry" },
      plain: { zh: "对称放射状的曼陀罗图案，繁复的几何与花纹", en: "Symmetrical radial mandala patterns with intricate geometry and ornament" },
      professionalTerms: ["mandala", "mandala pattern", "sacred geometry", "radial symmetry", "kaleidoscopic", "ornamental"],
      promptFragment: { zh: "曼陀罗风格，对称放射状的繁复几何花纹，神圣几何美学", en: "mandala style with symmetrical radial intricate geometric ornament, sacred-geometry aesthetic" },
      appliesTo: ["generic_image"],
      consumerTerms: ["曼陀罗", "神圣几何", "对称花纹"],
      riskHint: { zh: "", en: "" }
    },
    // ═══ 3C: Photography Genre (10 options) ═══
    {
      id: "image_art_style:fashion_photography",
      version: "0.1.0",
      label: { zh: "时尚摄影", en: "Fashion photography" },
      plain: { zh: "时装杂志级别的高端时尚摄影", en: "High-end fashion magazine-level editorial photography" },
      professionalTerms: ["fashion photography", "editorial", "magazine", "high fashion", "Vogue-style"],
      promptFragment: { zh: "时尚摄影风格，杂志级的高端造型和灯光", en: "fashion photography style with magazine-quality styling and lighting" },
      appliesTo: ["generic_image"],
      consumerTerms: ["时尚风", "大片感", "杂志风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:product_photography",
      version: "0.1.0",
      label: { zh: "产品摄影", en: "Product photography" },
      plain: { zh: "商业产品摄影，干净精准的光线控制", en: "Commercial product photography with clean precise lighting control" },
      professionalTerms: ["product photography", "commercial", "clean product shot", "studio"],
      promptFragment: { zh: "商业产品摄影风格，精准的布光和干净的背景", en: "commercial product photography style with precise lighting and clean background" },
      appliesTo: ["generic_image"],
      consumerTerms: ["产品图", "电商风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:food_photography",
      version: "0.1.0",
      label: { zh: "美食摄影", en: "Food photography" },
      plain: { zh: "诱人的美食摄影，近距离展示食材质感", en: "Appetizing food photography with close-up texture showcase" },
      professionalTerms: ["food photography", "culinary", "appetizing", "dish styling", "food porn"],
      promptFragment: { zh: "美食摄影风格，诱人的暖调光线，近距离展示食材质感", en: "food photography style with appetizing warm light and close-up texture detail" },
      appliesTo: ["generic_image"],
      consumerTerms: ["美食风", "烟火气"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:portrait_photography",
      version: "0.1.0",
      label: { zh: "人像摄影", en: "Portrait photography" },
      plain: { zh: "专业人像摄影，主体突出，背景柔化", en: "Professional portrait photography with prominent subject and soft background" },
      professionalTerms: ["portrait photography", "headshot", "professional portrait", "subject-focused"],
      promptFragment: { zh: "专业人像摄影风格，主体突出，背景柔和虚化", en: "professional portrait photography with prominent subject and softly blurred background" },
      appliesTo: ["generic_image"],
      consumerTerms: ["人像摄影", "写真"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:street_photography",
      version: "0.1.0",
      label: { zh: "街头摄影", en: "Street photography" },
      plain: { zh: "捕捉街头真实瞬间，自然的构图和光线", en: "Capturing authentic street moments with natural composition and light" },
      professionalTerms: ["street photography", "candid", "urban", "spontaneous", "documentary style"],
      promptFragment: { zh: "街头摄影风格，自然的抓拍感，真实的城市生活瞬间", en: "street photography style with natural candid feel and authentic urban life moments" },
      appliesTo: ["generic_image"],
      consumerTerms: ["街头风", "烟火气"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:architectural_photography",
      version: "0.1.0",
      label: { zh: "建筑摄影", en: "Architectural photography" },
      plain: { zh: "建筑空间的专业摄影，强调结构和光影", en: "Professional architectural photography emphasizing structure and light" },
      professionalTerms: ["architectural photography", "building shot", "structure", "perspective"],
      promptFragment: { zh: "建筑摄影风格，强调结构线条和空间光影关系", en: "architectural photography style emphasizing structural lines and spatial light-shadow relationship" },
      appliesTo: ["generic_image"],
      consumerTerms: ["建筑风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:macro_photography",
      version: "0.1.0",
      label: { zh: "微距摄影", en: "Macro photography" },
      plain: { zh: "极端近距离拍摄微小物体，展现肉眼看不见的细节", en: "Extreme close-up of tiny subjects revealing details invisible to the naked eye" },
      professionalTerms: ["macro photography", "extreme close-up", "detail", "tiny world"],
      promptFragment: { zh: "微距摄影风格，极端近距离拍摄，展现微观世界的细节", en: "macro photography style with extreme close-up revealing microscopic detail" },
      appliesTo: ["generic_image"],
      consumerTerms: ["微距感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:aerial_photography",
      version: "0.1.0",
      label: { zh: "航拍", en: "Aerial photography" },
      plain: { zh: "从高空俯瞰的航拍视角，展现大地的图案", en: "High-altitude aerial view revealing landscape patterns from above" },
      professionalTerms: ["aerial photography", "drone shot", "bird's eye", "overhead", "vast"],
      promptFragment: { zh: "航拍风格，从高空俯瞰的视角，展现大地的壮观图案", en: "aerial photography style with a bird's-eye view revealing grand landscape patterns" },
      appliesTo: ["generic_image"],
      consumerTerms: ["航拍"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:documentary_photography",
      version: "0.1.0",
      label: { zh: "纪实摄影", en: "Documentary photography" },
      plain: { zh: "真实记录的纪实摄影风格，不加修饰", en: "Authentic documentary photography with unembellished realism" },
      professionalTerms: ["documentary photography", "real-life", "authentic", "photojournalism"],
      promptFragment: { zh: "纪实摄影风格，真实记录不加修饰，自然的现场感", en: "documentary photography style with authentic unembellished recording and natural on-site feel" },
      appliesTo: ["generic_image"],
      consumerTerms: ["纪实风", "烟火气"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:film_photography",
      version: "0.1.0",
      label: { zh: "胶片摄影", en: "Film photography" },
      plain: { zh: "模拟胶片的温暖颗粒感和色彩偏移", en: "Analog film warmth with visible grain and subtle color shift" },
      professionalTerms: ["film photography", "analog", "film grain", "vintage", "warmth", "light leaks"],
      promptFragment: { zh: "胶片摄影风格，温暖的色调偏移，可见的颗粒质感", en: "film photography style with warm color shift and visible grain texture" },
      appliesTo: ["generic_image"],
      consumerTerms: ["胶片感", "复古风"],
      riskHint: { zh: "", en: "" }
    },
    // ═══ 3D: 3D Rendering Style (10 options) ═══
    {
      id: "image_art_style:photorealistic_render",
      version: "0.1.0",
      label: { zh: "写实渲染", en: "Photorealistic render" },
      plain: { zh: "Octane/V-Ray级别的超写实3D渲染", en: "Octane/V-Ray level hyper-realistic 3D rendering" },
      professionalTerms: ["photorealistic render", "Octane", "V-Ray", "realistic CGI", "ray tracing"],
      promptFragment: { zh: "照片级写实3D渲染，光线追踪级别的真实光影和材质", en: "photorealistic 3D render with ray-traced lighting and photoreal materials" },
      appliesTo: ["generic_image"],
      consumerTerms: ["3D渲染", "写实风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:cartoon_3d",
      version: "0.1.0",
      label: { zh: "卡通3D", en: "3D cartoon" },
      plain: { zh: "皮克斯风格的3D卡通渲染，圆润可爱", en: "Pixar-style 3D cartoon render, round and cute" },
      professionalTerms: ["3D cartoon", "Pixar style", "Blender toon", "soft rounded", "cute 3D"],
      promptFragment: { zh: "3D卡通渲染风格，圆润可爱的造型和柔和的材质", en: "3D cartoon render style with rounded cute forms and soft materials" },
      appliesTo: ["generic_image"],
      consumerTerms: ["3D卡通", "可爱风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:low_poly",
      version: "0.1.0",
      label: { zh: "低多边形", en: "Low poly" },
      plain: { zh: "由少量多边形面构成的3D风格，简洁有棱角", en: "3D style constructed from few polygon faces, clean and faceted" },
      professionalTerms: ["low poly", "faceted", "geometric 3D", "minimalist 3D", "angular"],
      promptFragment: { zh: "低多边形风格，由少量三角面构成的几何化3D造型", en: "low poly style with faceted geometric 3D forms built from few polygon faces" },
      appliesTo: ["generic_image"],
      consumerTerms: ["低多边形", "简约风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:clay_3d",
      version: "0.1.0",
      label: { zh: "黏土3D", en: "Clay 3D" },
      plain: { zh: "像橡皮泥捏出来的3D效果，软萌可爱", en: "Play-doh-like 3D effect, soft and adorable" },
      professionalTerms: ["clay render", "play-doh", "plasticine 3D", "soft material", "cute"],
      promptFragment: { zh: "黏土3D风格，像橡皮泥手工捏制的软萌效果", en: "clay 3D style resembling hand-molded plasticine with soft cute effect" },
      appliesTo: ["generic_image"],
      consumerTerms: ["黏土风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:isometric",
      version: "0.1.0",
      label: { zh: "等角投影", en: "Isometric" },
      plain: { zh: "等距视角的2.5D效果，常用于游戏和建筑", en: "Isometric 2.5D view commonly used in games and architecture" },
      professionalTerms: ["isometric render", "2.5D", "isometric view", "game-like", "diorama"],
      promptFragment: { zh: "等距投影风格，2.5D视角，适合场景和建筑展示", en: "isometric projection style with 2.5D perspective, ideal for scene and architecture display" },
      appliesTo: ["generic_image"],
      consumerTerms: ["等距风"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:voxel",
      version: "0.1.0",
      label: { zh: "体素", en: "Voxel" },
      plain: { zh: "我的世界式的方块化3D像素风格", en: "Minecraft-style blocky 3D pixel aesthetic" },
      professionalTerms: ["voxel art", "Minecraft style", "blocky 3D", "cubic", "retro game 3D"],
      promptFragment: { zh: "体素风格，由小方块组成的3D像素化世界", en: "voxel style with a 3D pixelated world built from small cubes" },
      appliesTo: ["generic_image"],
      consumerTerms: ["像素风", "体素"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:clay_white_render",
      version: "0.1.0",
      label: { zh: "白模渲染", en: "Clay white render" },
      plain: { zh: "纯白色的3D素模，展示形体而不展示材质", en: "Pure white 3D clay model showing form without materials" },
      professionalTerms: ["clay render", "matte white", "ambient occlusion", "uncolored", "prototype"],
      promptFragment: { zh: "白模渲染风格，纯白色的3D模型，专注于形体结构", en: "clay white render style with pure white 3D models focused on form and structure" },
      appliesTo: ["generic_image"],
      consumerTerms: ["素模", "白模"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:glass_render",
      version: "0.1.0",
      label: { zh: "玻璃/透明", en: "Glass render" },
      plain: { zh: "透明的玻璃/水晶质感渲染", en: "Transparent glass/crystal material rendering" },
      professionalTerms: ["glass render", "transparent material", "crystal", "refractive", "translucent"],
      promptFragment: { zh: "玻璃质感渲染，透明的折射和反射效果", en: "glass material render with transparent refractive and reflective effects" },
      appliesTo: ["generic_image"],
      consumerTerms: ["玻璃质感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:metallic_render",
      version: "0.1.0",
      label: { zh: "金属质感", en: "Metallic render" },
      plain: { zh: "高反光的金属材质渲染", en: "Highly reflective metallic material rendering" },
      professionalTerms: ["metallic render", "chrome", "reflective", "polished metal", "shiny"],
      promptFragment: { zh: "金属质感渲染，高反光的镜面金属表面", en: "metallic material render with highly reflective mirror-like metal surfaces" },
      appliesTo: ["generic_image"],
      consumerTerms: ["金属质感", "科技感"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_art_style:neon_glow_render",
      version: "0.1.0",
      label: { zh: "霓虹发光", en: "Neon glow render" },
      plain: { zh: "霓虹灯管发光效果的3D渲染", en: "Neon tube glow effect 3D rendering" },
      professionalTerms: ["neon render", "emissive", "glow", "luminous", "cyberpunk 3D", "light emission"],
      promptFragment: { zh: "霓虹发光渲染，自发光的灯管和亮面，赛博朋克氛围", en: "neon glow render with self-illuminating tubes and luminous surfaces, cyberpunk atmosphere" },
      appliesTo: ["generic_image"],
      consumerTerms: ["赛博朋克", "科技感"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
