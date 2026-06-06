import type { OptionSet } from "../../types";

export const imagePostProcessingOptions: OptionSet = {
  id: "image_post_processing",
  version: "0.1.0",
  label: { zh: "后期/特效", en: "Post-processing / Effects" },
  categories: [
    {
      id: "cat:image_post_processing:lens",
      label: { zh: "镜头/光学效果", en: "Lens / Optical" },
      optionIds: [
        "image_post_processing:bokeh", "image_post_processing:vignette", "image_post_processing:lens_flare",
        "image_post_processing:soft_focus_glow", "image_post_processing:chromatic_aberration",
        "image_post_processing:tilt_shift", "image_post_processing:light_leak"
      ]
    },
    {
      id: "cat:image_post_processing:style",
      label: { zh: "风格/质感效果", en: "Style / Texture" },
      optionIds: [
        "image_post_processing:film_grain", "image_post_processing:hdr", "image_post_processing:double_exposure",
        "image_post_processing:long_exposure", "image_post_processing:glitch", "image_post_processing:aged_photo",
        "image_post_processing:color_grading"
      ]
    }
  ],
  options: [
    // ── Lens / Optical ──
    {
      id: "image_post_processing:bokeh",
      version: "0.1.0",
      label: { zh: "散景/背景虚化", en: "Bokeh / DOF" },
      plain: { zh: "浅景深的散景效果，背景柔和虚化，突出主体", en: "Shallow depth of field with creamy bokeh blur, emphasizing the subject" },
      professionalTerms: ["bokeh", "depth of field", "shallow focus", "background blur", "lens blur"],
      promptFragment: { zh: "散景效果，浅景深，背景柔和虚化突出主体", en: "bokeh effect with shallow depth of field, soft background blur emphasizing the subject" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:vignette",
      version: "0.1.0",
      label: { zh: "暗角", en: "Vignette" },
      plain: { zh: "画面四角渐暗，引导视线聚焦画面中心", en: "Darkened edges that naturally draw the eye toward the center" },
      professionalTerms: ["vignette", "darkened edges", "framing", "focus draw", "subtle frame"],
      promptFragment: { zh: "暗角效果，四角渐暗，引导视线聚焦中心", en: "vignette with subtly darkened edges drawing focus to the center" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:lens_flare",
      version: "0.1.0",
      label: { zh: "镜头光晕", en: "Lens flare" },
      plain: { zh: "明亮光源产生的镜头光晕，增添电影感和氛围", en: "Bright light source creating lens flare for cinematic atmosphere" },
      professionalTerms: ["lens flare", "light refraction", "optical artifact", "cinematic"],
      promptFragment: { zh: "镜头光晕效果，光源折射产生的光斑，增添电影氛围", en: "lens flare effect with light refraction artifacts for cinematic atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:soft_focus_glow",
      version: "0.1.0",
      label: { zh: "柔焦/光晕", en: "Soft focus / glow" },
      plain: { zh: "柔和的发光效果，光晕弥漫，梦幻浪漫", en: "Soft glowing bloom effect, dreamy and romantic with diffused light" },
      professionalTerms: ["soft focus", "bloom", "glow", "ethereal", "dreamy haze"],
      promptFragment: { zh: "柔焦光晕效果，光线柔和弥漫，梦幻浪漫的氛围", en: "soft focus glow with diffused blooming light, dreamy romantic atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:chromatic_aberration",
      version: "0.1.0",
      label: { zh: "色差", en: "Chromatic aberration" },
      plain: { zh: "镜头色差/色散效果，边缘出现 RGB 分离", en: "Lens chromatic aberration with RGB color fringing at edges" },
      professionalTerms: ["chromatic aberration", "color fringing", "lens imperfection", "RGB split"],
      promptFragment: { zh: "色差效果，边缘 RGB 色彩分离，镜头瑕疵美感", en: "chromatic aberration with RGB color fringing at edges, lens imperfection aesthetic" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:tilt_shift",
      version: "0.1.0",
      label: { zh: "移轴", en: "Tilt-shift" },
      plain: { zh: "移轴效果，让真实场景看起来像微缩模型", en: "Tilt-shift effect making real scenes look like miniature models" },
      professionalTerms: ["tilt-shift", "miniature effect", "selective focus", "tiny world", "diorama"],
      promptFragment: { zh: "移轴效果，让场景呈现微缩模型般的观感", en: "tilt-shift effect giving the scene a miniature diorama-like appearance" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "移轴效果在部分模型上难以精确控制模糊区域", en: "Tilt-shift blur zones can be difficult to control precisely on some models." }
    },
    {
      id: "image_post_processing:light_leak",
      version: "0.1.0",
      label: { zh: "漏光", en: "Light leak" },
      plain: { zh: "模拟胶片相机漏光效果，温暖橙红调", en: "Simulated film camera light leak with warm orange-red tones" },
      professionalTerms: ["light leak", "vintage film", "accidental exposure", "retro", "warm flare"],
      promptFragment: { zh: "漏光效果，模拟胶片相机的温暖橙红光线渗入", en: "light leak effect simulating vintage film with warm orange-red light seepage" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Style / Texture ──
    {
      id: "image_post_processing:film_grain",
      version: "0.1.0",
      label: { zh: "胶片颗粒", en: "Film grain" },
      plain: { zh: "胶片颗粒质感，增加有机纹理和复古感", en: "Film grain texture adding organic noise and vintage character" },
      professionalTerms: ["film grain", "analog texture", "noise", "vintage", "organic"],
      promptFragment: { zh: "胶片颗粒质感，有机纹理，复古氛围", en: "film grain texture with organic noise for vintage atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:hdr",
      version: "0.1.0",
      label: { zh: "高动态范围", en: "HDR" },
      plain: { zh: "HDR高动态范围效果，丰富的阴影和高光细节", en: "High dynamic range with rich detail in both shadows and highlights" },
      professionalTerms: ["HDR", "high dynamic range", "rich shadows", "bright highlights", "tonal range"],
      promptFragment: { zh: "HDR 高动态范围效果，阴影和高光细节丰富", en: "HDR high dynamic range with rich shadow and highlight detail" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:double_exposure",
      version: "0.1.0",
      label: { zh: "双重曝光", en: "Double exposure" },
      plain: { zh: "两幅画面叠加，形成梦幻的艺术融合效果", en: "Two images overlaid creating a dreamy artistic blend" },
      professionalTerms: ["double exposure", "overlay", "ghost image", "blend", "composite"],
      promptFragment: { zh: "双重曝光效果，两幅画面叠加融合，梦幻艺术感", en: "double exposure effect with two images overlaid in a dreamy artistic blend" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "双重曝光效果在不同模型上表现差异很大，Midjourney 的 /blend 功能可能更适合实现此效果", en: "Double exposure varies widely between models; Midjourney's /blend may be better suited for this effect." }
    },
    {
      id: "image_post_processing:long_exposure",
      version: "0.1.0",
      label: { zh: "长曝光", en: "Long exposure" },
      plain: { zh: "长曝光效果，运动物体产生拖影，光流轨迹", en: "Long exposure effect with motion blur and light trail streaks" },
      professionalTerms: ["long exposure", "motion blur", "light trails", "time-lapse still", "flow"],
      promptFragment: { zh: "长曝光效果，运动拖影，光流轨迹", en: "long exposure effect with motion blur and flowing light trails" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:glitch",
      version: "0.1.0",
      label: { zh: "故障效果", en: "Glitch effect" },
      plain: { zh: "数字故障艺术效果，画面撕裂、像素偏移", en: "Digital glitch art with screen tearing and pixel shifting" },
      professionalTerms: ["glitch", "digital distortion", "datamosh", "corruption", "VHS error"],
      promptFragment: { zh: "数字故障效果，画面撕裂，像素偏移", en: "digital glitch effect with screen tearing and pixel shifting" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "部分模型可能无法正确渲染故障艺术效果或将其误解为输出错误", en: "Some models may not render glitch effects correctly or may interpret them as output errors." }
    },
    {
      id: "image_post_processing:aged_photo",
      version: "0.1.0",
      label: { zh: "老照片/做旧", en: "Aged photo / vintage" },
      plain: { zh: "老照片做旧效果，泛黄褪色，有年代感", en: "Aged vintage photo look with sepia tones, fading, and antique character" },
      professionalTerms: ["aged photo", "sepia", "faded", "distressed", "antique", "worn"],
      promptFragment: { zh: "老照片做旧效果，泛黄褪色，充满年代感", en: "aged vintage photo with sepia fading and antique worn character" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_post_processing:color_grading",
      version: "0.1.0",
      label: { zh: "色彩分级", en: "Color grading" },
      plain: { zh: "专业电影级色彩分级，如青橙调色等", en: "Professional cinematic color grading like teal-orange or film LUT looks" },
      professionalTerms: ["color grading", "teal-orange", "cinematic grade", "film LUT", "mood color"],
      promptFragment: { zh: "专业色彩分级，电影级调色，氛围色彩", en: "professional color grading with cinematic film LUT mood coloring" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
