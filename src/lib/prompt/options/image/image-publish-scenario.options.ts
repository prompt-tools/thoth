import type { OptionSet } from "../../types";

/** 发布场景：仅用于推荐画幅，不参与 templateMap 拼接（无输出片段）。 */
const NO_FRAGMENT = { zh: "", en: "" };

export const imagePublishScenarioOptions: OptionSet = {
  id: "image_publish_scenario",
  version: "0.1.0",
  label: { zh: "发布场景", en: "Publish scenario" },
  categories: [
    {
      id: "cat:image_publish_scenario:all",
      label: { zh: "发在哪里", en: "Where to publish" },
      optionIds: [
        "image_publish_scenario:rednote_portrait",
        "image_publish_scenario:instagram_square",
        "image_publish_scenario:phone_wallpaper",
        "image_publish_scenario:horizontal_cover",
        "image_publish_scenario:desktop_wallpaper",
        "image_publish_scenario:print_poster",
        "image_publish_scenario:product_ecommerce",
        "image_publish_scenario:general"
      ]
    }
  ],
  options: [
    {
      id: "image_publish_scenario:rednote_portrait",
      version: "0.1.0",
      label: { zh: "小红书 / 竖版社交图", en: "RedNote / vertical social" },
      plain: { zh: "竖版信息流配图，偏 4:5 或 3:4", en: "Vertical feed images, often 4:5 or 3:4" },
      professionalTerms: ["vertical social", "4:5", "portrait feed"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "推荐竖幅比例，可改选其他", en: "Portrait ratios recommended" },
      suggests: {
        aspect_ratio: ["image_aspect_ratio:portrait_4_5", "image_aspect_ratio:portrait_3_4"]
      },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:instagram_square",
      version: "0.1.0",
      label: { zh: "Instagram 方图 / 头像", en: "Instagram square / avatar" },
      plain: { zh: "正方形构图，适合头像与方图帖", en: "Square format for avatars and posts" },
      professionalTerms: ["square", "1:1", "avatar"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "常用 1:1", en: "Typically 1:1" },
      suggests: { aspect_ratio: ["image_aspect_ratio:square_1_1"] },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:phone_wallpaper",
      version: "0.1.0",
      label: { zh: "手机壁纸 / 竖屏全屏", en: "Phone wallpaper" },
      plain: { zh: "全屏竖屏画面", en: "Full-screen vertical image" },
      professionalTerms: ["phone wallpaper", "9:16", "vertical"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "常用 9:16", en: "Typically 9:16" },
      suggests: { aspect_ratio: ["image_aspect_ratio:portrait_9_16"] },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:horizontal_cover",
      version: "0.1.0",
      label: { zh: "横版封面 / 横幅", en: "Horizontal cover / banner" },
      plain: { zh: "宽画幅封面、头图、横幅", en: "Wide covers and hero banners" },
      professionalTerms: ["banner", "16:9", "hero image"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "推荐 16:9 或电影宽幅", en: "16:9 or cinematic wide" },
      suggests: {
        aspect_ratio: ["image_aspect_ratio:landscape_16_9", "image_aspect_ratio:cinematic_scope"]
      },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:desktop_wallpaper",
      version: "0.1.0",
      label: { zh: "电脑壁纸 / 宽屏", en: "Desktop wallpaper" },
      plain: { zh: "桌面宽屏壁纸", en: "Wide desktop wallpaper" },
      professionalTerms: ["desktop wallpaper", "widescreen", "ultra wide"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "推荐横屏宽幅", en: "Wide landscape recommended" },
      suggests: {
        aspect_ratio: ["image_aspect_ratio:landscape_16_9", "image_aspect_ratio:ultra_wide_2_1"]
      },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:print_poster",
      version: "0.1.0",
      label: { zh: "海报 / 印刷竖版", en: "Poster / print vertical" },
      plain: { zh: "印刷海报、竖版宣传图", en: "Print posters, vertical promo" },
      professionalTerms: ["poster", "2:3", "print"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "推荐 2:3 或 3:4", en: "2:3 or 3:4 typical" },
      suggests: {
        aspect_ratio: ["image_aspect_ratio:portrait_2_3", "image_aspect_ratio:portrait_3_4"]
      },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:product_ecommerce",
      version: "0.1.0",
      label: { zh: "电商主图 / 产品图", en: "E-commerce product" },
      plain: { zh: "商品主图、产品展示", en: "Product listing hero shots" },
      professionalTerms: ["product photo", "e-commerce", "catalog"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "方图或 4:3 横图", en: "Square or 4:3 landscape" },
      suggests: {
        aspect_ratio: ["image_aspect_ratio:square_1_1", "image_aspect_ratio:landscape_4_3"]
      },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_publish_scenario:general",
      version: "0.1.0",
      label: { zh: "还没想好 / 通用", en: "Not sure yet / general" },
      plain: { zh: "暂不限定发布场景，自行选画幅", en: "No preset scene; pick any ratio" },
      professionalTerms: ["general", "flexible"],
      promptFragment: NO_FRAGMENT,
      appliesTo: ["generic_image"],
      usageHint: { zh: "将展示全部 12 种比例", en: "Shows all 12 ratios" },
      riskHint: { zh: "", en: "" }
    }
  ]
};
