import type { OptionSet } from "../../types";

export const imageAspectRatioOptions: OptionSet = {
  id: "image_aspect_ratio",
  version: "0.1.0",
  label: { zh: "画面比例", en: "Aspect ratio" },
  categories: [
    {
      id: "cat:image_aspect_ratio:portrait",
      label: { zh: "竖幅", en: "Portrait" },
      optionIds: [
        "image_aspect_ratio:square_1_1", "image_aspect_ratio:portrait_9_16",
        "image_aspect_ratio:portrait_2_3", "image_aspect_ratio:portrait_4_5",
        "image_aspect_ratio:portrait_3_4"
      ]
    },
    {
      id: "cat:image_aspect_ratio:landscape",
      label: { zh: "横幅", en: "Landscape" },
      optionIds: [
        "image_aspect_ratio:landscape_16_9", "image_aspect_ratio:cinematic_scope",
        "image_aspect_ratio:landscape_3_2", "image_aspect_ratio:landscape_4_3",
        "image_aspect_ratio:ultra_wide_2_1", "image_aspect_ratio:landscape_5_4",
        "image_aspect_ratio:panorama_3_1"
      ]
    }
  ],
  options: [
    {
      id: "image_aspect_ratio:square_1_1",
      version: "0.1.0",
      label: { zh: "正方形 1:1", en: "Square 1:1" },
      plain: { zh: "正方形构图，经典社交媒体比例", en: "Square format, classic social media ratio" },
      professionalTerms: ["square format", "1:1", "Instagram square", "social media"],
      promptFragment: { zh: "1:1 正方形画幅", en: "1:1 square aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合 Instagram、头像、产品图", en: "Good for Instagram, avatars, product shots" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:portrait_9_16",
      version: "0.1.0",
      label: { zh: "竖屏 9:16", en: "Portrait 9:16" },
      plain: { zh: "手机全屏竖屏比例，适合移动端内容", en: "Full-screen mobile portrait, ideal for phone-first content" },
      professionalTerms: ["vertical format", "9:16", "mobile portrait", "phone wallpaper"],
      promptFragment: { zh: "9:16 竖屏画幅", en: "9:16 vertical portrait aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合手机壁纸、Stories、Reels", en: "Good for phone wallpaper, Stories, Reels" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:portrait_2_3",
      version: "0.1.0",
      label: { zh: "经典竖幅 2:3", en: "Classic portrait 2:3" },
      plain: { zh: "经典竖幅比例，适合人像和印刷品", en: "Classic vertical ratio for portraits and print" },
      professionalTerms: ["portrait 2:3", "classic portrait", "book cover", "poster"],
      promptFragment: { zh: "2:3 经典竖幅构图", en: "2:3 classic portrait aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合人像、海报、书封", en: "Good for portraits, posters, book covers" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:portrait_4_5",
      version: "0.1.0",
      label: { zh: "竖幅 4:5", en: "Portrait 4:5" },
      plain: { zh: "社交媒体优化竖幅比例", en: "Social-media-optimized vertical ratio" },
      professionalTerms: ["4:5 portrait", "Instagram optimized", "social portrait"],
      promptFragment: { zh: "4:5 竖幅构图", en: "4:5 portrait aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合 Instagram 竖图、小红书", en: "Good for Instagram portrait, RedNote" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:portrait_3_4",
      version: "0.1.0",
      label: { zh: "竖幅 3:4", en: "Portrait 3:4" },
      plain: { zh: "印刷标准竖幅比例", en: "Print-standard vertical ratio" },
      professionalTerms: ["3:4 portrait", "print standard", "magazine", "poster"],
      promptFragment: { zh: "3:4 竖幅构图", en: "3:4 portrait aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合印刷品、杂志、海报", en: "Good for print, magazines, posters" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:landscape_16_9",
      version: "0.1.0",
      label: { zh: "横幅 16:9", en: "Landscape 16:9" },
      plain: { zh: "宽屏标准比例，最常见的横向画幅", en: "Standard widescreen, the most common landscape format" },
      professionalTerms: ["widescreen", "16:9 landscape", "desktop", "presentation"],
      promptFragment: { zh: "16:9 宽屏横幅构图", en: "16:9 widescreen landscape aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合桌面壁纸、YouTube缩略图、PPT", en: "Good for desktop wallpaper, YouTube thumbnails, slides" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:cinematic_scope",
      version: "0.1.0",
      label: { zh: "宽屏电影 2.35:1", en: "Cinematic scope 2.35:1" },
      plain: { zh: "超宽电影画幅，营造电影感", en: "Ultra-wide cinematic format for a film-like feel" },
      professionalTerms: ["cinematic widescreen", "2.35:1", "anamorphic", "film scope"],
      promptFragment: { zh: "2.35:1 宽屏电影画幅", en: "2.35:1 cinematic widescreen aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合电影感画面、横幅、头图", en: "Good for cinematic look, banners, hero images" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:landscape_3_2",
      version: "0.1.0",
      label: { zh: "经典横幅 3:2", en: "Classic landscape 3:2" },
      plain: { zh: "35mm 胶片经典比例，摄影标准", en: "Classic 35mm film ratio, photography standard" },
      professionalTerms: ["classic 3:2", "3:2 landscape", "landscape 3:2", "35mm film ratio", "photography standard"],
      promptFragment: { zh: "3:2 经典摄影横幅构图", en: "3:2 classic photography landscape aspect ratio" },
      appliesTo: ["generic_image"],
      consumerTerms: ["横幅 3:2", "经典比例", "3:2 横版"],
      usageHint: { zh: "适合经典35mm摄影比例", en: "Good for classic 35mm photography look" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:landscape_4_3",
      version: "0.1.0",
      label: { zh: "横幅 4:3", en: "Landscape 4:3" },
      plain: { zh: "传统照片和屏幕比例", en: "Traditional photo and screen ratio" },
      professionalTerms: ["4:3 landscape", "traditional photo", "tablet"],
      promptFragment: { zh: "4:3 横幅构图", en: "4:3 landscape aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合传统照片、iPad 屏幕", en: "Good for traditional photos, iPad display" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:ultra_wide_2_1",
      version: "0.1.0",
      label: { zh: "超宽横幅 2:1", en: "Ultra wide 2:1" },
      plain: { zh: "超宽全景比例，适合网页头图", en: "Ultra-wide panoramic ratio for web hero images" },
      professionalTerms: ["ultra wide 2:1", "panoramic", "web hero", "banner"],
      promptFragment: { zh: "2:1 超宽横幅构图", en: "2:1 ultra wide landscape aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合网页头图、全景展示", en: "Good for web hero images, panoramic display" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:landscape_5_4",
      version: "0.1.0",
      label: { zh: "横幅 5:4", en: "Landscape 5:4" },
      plain: { zh: "略偏方的横幅，印刷和标准照片常用", en: "Slightly squarish landscape, common for print and standard photos" },
      professionalTerms: ["5:4 landscape", "print standard", "classic photo"],
      promptFragment: { zh: "5:4 横幅构图", en: "5:4 landscape aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合印刷品、标准照片", en: "Good for print, standard photo" },
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_aspect_ratio:panorama_3_1",
      version: "0.1.0",
      label: { zh: "全景 3:1", en: "Panorama 3:1" },
      plain: { zh: "超宽全景，极致的横向视野", en: "Ultra-wide panoramic with extreme horizontal field of view" },
      professionalTerms: ["panorama 3:1", "ultra-wide", "panoramic", "banner"],
      promptFragment: { zh: "3:1 超宽全景构图", en: "3:1 ultra-wide panoramic aspect ratio" },
      appliesTo: ["generic_image"],
      usageHint: { zh: "适合超宽全景、横幅广告", en: "Good for ultra-wide panorama, banner ads" },
      riskHint: { zh: "", en: "" }
    }
  ]
};
