import type { OptionSet } from "../../types";

export const imageSceneOptions: OptionSet = {
  id: "image_scene",
  version: "0.1.0",
  label: { zh: "背景/场景", en: "Background / Scene" },
  categories: [
    {
      id: "cat:image_scene:clean_backgrounds",
      label: { zh: "简洁背景", en: "Clean Backgrounds" },
      optionIds: [
        "image_scene:solid_color", "image_scene:white_bg", "image_scene:black_bg",
        "image_scene:gradient_bg", "image_scene:transparent_bg"
      ]
    },
    {
      id: "cat:image_scene:environmental",
      label: { zh: "场景背景", en: "Environmental" },
      optionIds: [
        "image_scene:natural_landscape", "image_scene:snow_scene", "image_scene:neon_cityscape",
        "image_scene:urban_street", "image_scene:indoor_setting",
        "image_scene:studio_env", "image_scene:garden_floral", "image_scene:sky_cloud",
        "image_scene:starry_cosmos"
      ]
    },
    {
      id: "cat:image_scene:artistic",
      label: { zh: "艺术/纹理", en: "Artistic / Textured" },
      optionIds: [
        "image_scene:abstract_bg", "image_scene:blurred_bokeh", "image_scene:textured_bg"
      ]
    }
  ],
  options: [
    {
      id: "image_scene:solid_color",
      version: "0.1.0",
      label: { zh: "纯色背景", en: "Solid color background" },
      plain: { zh: "没有图案的纯色背景，突出主体", en: "A solid color background without patterns, emphasizing the subject" },
      professionalTerms: ["solid color", "seamless backdrop", "plain background", "clean"],
      promptFragment: {
        zh: "纯色背景，画面简洁，主体突出不受干扰",
        en: "solid color background, clean composition with the subject standing out clearly"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:white_bg",
      version: "0.1.0",
      label: { zh: "白色背景", en: "White background" },
      plain: { zh: "干净的纯白背景，适合产品和肖像", en: "Clean pure white background, ideal for products and portraits" },
      professionalTerms: ["white background", "studio backdrop", "clean", "minimal", "product"],
      promptFragment: {
        zh: "纯白色背景，光线均匀柔和，主体清晰突出",
        en: "pure white background with even, soft lighting, making the subject clearly stand out"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:black_bg",
      version: "0.1.0",
      label: { zh: "黑色背景", en: "Black background" },
      plain: { zh: "深黑色背景，营造戏剧感和高级感", en: "Deep black background for dramatic and premium feel" },
      professionalTerms: ["black background", "dark backdrop", "dark bg", "dramatic", "contrast"],
      promptFragment: {
        zh: "深黑色背景，强烈的明暗对比，画面具有戏剧张力",
        en: "deep black background with strong light-dark contrast and dramatic tension"
      },
      appliesTo: ["generic_image"],
      consumerTerms: ["深色背景", "暗黑背景", "黑底"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:gradient_bg",
      version: "0.1.0",
      label: { zh: "渐变背景", en: "Gradient background" },
      plain: { zh: "颜色平滑过渡的渐变背景，现代感", en: "Smooth color transition gradient background with modern feel" },
      professionalTerms: ["gradient", "smooth color transition", "modern", "soft"],
      promptFragment: {
        zh: "渐变背景，颜色平滑过渡，画面具有现代感和层次",
        en: "gradient background with smooth color transitions, giving a modern and layered look"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:blurred_bokeh",
      version: "0.1.0",
      label: { zh: "模糊/散景背景", en: "Blurred bokeh background" },
      plain: { zh: "虚化的散景背景，圆点光斑效果", en: "Shallow depth of field with soft bokeh light circles" },
      professionalTerms: ["bokeh", "blurred", "shallow depth of field", "out of focus bg"],
      promptFragment: {
        zh: "虚化散景背景，浅景深效果，梦幻的光斑让主体突出",
        en: "blurred bokeh background with shallow depth of field, dreamy light circles making the subject pop"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:natural_landscape",
      version: "0.1.0",
      label: { zh: "自然风景背景", en: "Natural landscape" },
      plain: { zh: "山脉、海洋、森林等自然环境作为背景", en: "Mountains, ocean, forest as the backdrop" },
      professionalTerms: ["landscape background", "mountain", "forest", "ocean", "nature"],
      promptFragment: {
        zh: "自然风景作为画面背景，山川、海洋或森林构成环境氛围",
        en: "a natural landscape as the backdrop, with mountains, ocean, or forest creating the environmental mood"
      },
      appliesTo: ["generic_image"],
      consumerTerms: ["自然风景", "山水", "户外背景"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:snow_scene",
      version: "0.1.0",
      label: { zh: "冰雪场景", en: "Snow / winter scene" },
      plain: { zh: "雪原、雪山、冰天雪地等冬季雪景背景", en: "Snowfields, snowy mountains, icy winter landscapes as the backdrop" },
      professionalTerms: ["snow scene", "snow covered", "snowy terrain", "snow ice", "winter wonderland", "icy"],
      promptFragment: {
        zh: "冰雪场景背景，雪原、雪山或冰封大地构成的冬日环境",
        en: "a snow/winter scene backdrop with snowfields, snowy mountains or icy terrain"
      },
      appliesTo: ["generic_image"],
      consumerTerms: ["雪景", "冰雪", "雪地背景", "冬天"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:neon_cityscape",
      version: "0.1.0",
      label: { zh: "霓虹都市", en: "Neon cityscape" },
      plain: { zh: "霓虹灯林立的赛博都市夜景，摩天楼与发光招牌", en: "A neon-lit cyber city night: skyscrapers and glowing signage" },
      professionalTerms: ["neon city", "neon cityscape", "neon-lit street", "neon-lit cityscape", "neon signs", "urban night"],
      promptFragment: {
        zh: "霓虹都市背景，赛博风格的城市夜景，摩天楼、发光招牌与霓虹街道",
        en: "a neon cityscape backdrop, a cyber-style city night with skyscrapers, glowing signage and neon streets"
      },
      appliesTo: ["generic_image"],
      consumerTerms: ["霓虹都市", "赛博都市", "霓虹夜景"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:urban_street",
      version: "0.1.0",
      label: { zh: "城市街景", en: "Urban street" },
      plain: { zh: "城市街道、建筑、人流作为背景", en: "Urban streets, buildings, and street life as backdrop" },
      professionalTerms: ["urban street", "cityscape", "street background", "city life"],
      promptFragment: {
        zh: "城市街景作为背景，建筑和街道构成都市氛围",
        en: "an urban street scene as the backdrop, with buildings and streets creating the city atmosphere"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:indoor_setting",
      version: "0.1.0",
      label: { zh: "室内空间", en: "Indoor setting" },
      plain: { zh: "温馨或现代的室内空间作为背景", en: "Cozy or modern indoor space as the setting" },
      professionalTerms: ["interior", "room", "indoor background", "cozy", "modern"],
      promptFragment: {
        zh: "室内空间作为场景背景，温馨或现代的陈设营造氛围",
        en: "an indoor setting as the scene, with cozy or modern furnishings creating the atmosphere"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:abstract_bg",
      version: "0.1.0",
      label: { zh: "抽象背景", en: "Abstract background" },
      plain: { zh: "几何、流体或艺术化的抽象背景", en: "Geometric, fluid, or artistic abstract background" },
      professionalTerms: ["abstract", "geometric", "fluid", "artistic background", "non-representational"],
      promptFragment: {
        zh: "抽象艺术背景，几何形或流动色彩构成非具象的画面环境",
        en: "abstract art background with geometric shapes or fluid colors forming a non-representational setting"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:sky_cloud",
      version: "0.1.0",
      label: { zh: "天空/云", en: "Sky / cloud" },
      plain: { zh: "天空和云朵作为画面背景", en: "Sky and clouds as the scene background" },
      professionalTerms: ["sky background", "cloudscape", "aerial backdrop", "vast"],
      promptFragment: {
        zh: "天空和云朵构成广阔的画面背景，带来开阔和轻盈的视觉感受",
        en: "the sky and clouds forming a vast backdrop, creating an open and airy visual feel"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:studio_env",
      version: "0.1.0",
      label: { zh: "工作室背景", en: "Studio environment" },
      plain: { zh: "专业摄影棚环境，可控灯光", en: "Professional studio environment with controlled lighting" },
      professionalTerms: ["studio", "professional backdrop", "controlled lighting", "clean"],
      promptFragment: {
        zh: "专业工作室环境，光线可控，背景干净",
        en: "a professional studio environment with controlled lighting and clean backdrops"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:transparent_bg",
      version: "0.1.0",
      label: { zh: "透明/无背景", en: "Transparent / no background" },
      plain: { zh: "主体从背景中抠出，适合后期合成", en: "Subject cut out from background, suitable for compositing" },
      professionalTerms: ["transparent", "cutout", "isolated", "no background", "PNG"],
      promptFragment: {
        zh: "主体与背景完全分离，背景为透明，便于后期合成使用",
        en: "the subject completely separated from the background, with transparency for compositing"
      },
      appliesTo: ["generic_image"],
      riskHint: {
        zh: "并非所有模型都稳定支持透明背景输出，建议在工具端确认兼容性",
        en: "Not all models consistently support transparent background output; verify compatibility with your tool."
      }
    },
    {
      id: "image_scene:textured_bg",
      version: "0.1.0",
      label: { zh: "纹理背景", en: "Textured background" },
      plain: { zh: "纸张、织物、石材等有肌理的背景", en: "Paper, fabric, stone, and other tactile textures as background" },
      professionalTerms: ["texture", "paper", "fabric", "grunge", "tactile background"],
      promptFragment: {
        zh: "具有肌理质感的背景，纸张、织物或石材纹理增加画面层次",
        en: "a textured background with paper, fabric, or stone grain adding depth and tactility"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:garden_floral",
      version: "0.1.0",
      label: { zh: "花园/植物", en: "Garden / floral" },
      plain: { zh: "花园、植物丛、花卉作为背景", en: "Garden, foliage, and flowers as the backdrop" },
      professionalTerms: ["garden", "botanical", "floral background", "lush", "green"],
      promptFragment: {
        zh: "花园和植物构成自然清新的背景，绿意盎然",
        en: "a garden and botanical setting forming a fresh, natural backdrop with lush greenery"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_scene:starry_cosmos",
      version: "0.1.0",
      label: { zh: "星空/宇宙", en: "Starry sky / cosmos" },
      plain: { zh: "星空、银河、宇宙空间作为背景", en: "Starry sky, galaxy, and cosmic space as backdrop" },
      professionalTerms: ["starry sky", "space", "cosmos", "galaxy", "universe background"],
      promptFragment: {
        zh: "星空和宇宙空间构成恢弘的深空背景，繁星与星云点缀其间",
        en: "a starry sky and cosmic space forming a grand deep-space backdrop with stars and nebulae"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
