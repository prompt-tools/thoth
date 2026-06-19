import type { OptionSet } from "../../types";

/** 妆容 / makeup — portrait finishing detail for close-up and medium shots. */
export const imageMakeupOptions: OptionSet = {
  id: "image_makeup",
  version: "0.1.0",
  label: { zh: "妆容", en: "Makeup" },
  options: [
    {
      id: "image_makeup:natural",
      version: "0.1.0",
      label: { zh: "素颜/淡妆", en: "Natural / minimal" },
      plain: { zh: "几乎无妆或极淡日常妆，保留真实皮肤质感", en: "Barely-there or minimal everyday makeup with realistic skin" },
      professionalTerms: ["no makeup look", "natural skin", "minimal makeup"],
      promptFragment: { zh: "素颜或极淡日常妆，皮肤质感真实自然", en: "natural minimal makeup with authentic realistic skin texture" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_makeup:soft_glam",
      version: "0.1.0",
      label: { zh: "精致淡妆", en: "Soft glam" },
      plain: { zh: "柔和提亮、自然眼妆与唇色，精致但不浓艳", en: "Soft highlight, natural eye and lip color, refined but not heavy" },
      professionalTerms: ["soft glam", "polished makeup", "subtle enhancement"],
      promptFragment: { zh: "精致淡妆，柔和提亮与自然眼妆唇色，干净通透", en: "soft glam makeup with subtle highlight, natural eye and lip color, clean polished finish" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_makeup:editorial",
      version: "0.1.0",
      label: { zh: "时尚大片妆", en: "Editorial makeup" },
      plain: { zh: "杂志大片感，轮廓清晰、妆面完整有设计感", en: "Magazine editorial look with defined contours and designed makeup" },
      professionalTerms: ["editorial makeup", "fashion beauty", "styled makeup"],
      promptFragment: { zh: "时尚大片妆容，轮廓清晰，妆面完整有设计感", en: "editorial fashion makeup with defined contours and complete styled beauty look" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_makeup:gothic",
      version: "0.1.0",
      label: { zh: "暗黑哥特妆", en: "Gothic makeup" },
      plain: { zh: "深色眼妆、苍白底妆或红唇，哥特/暗黑气质", en: "Dark eye makeup, pale base or red lips, gothic mood" },
      professionalTerms: ["gothic makeup", "dark beauty", "dramatic eyes"],
      promptFragment: { zh: "暗黑哥特妆容，深色眼妆与苍白底妆或红唇，气质神秘冷艳", en: "gothic makeup with dark eye makeup, pale base or red lips, mysterious cold beauty" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_makeup:idol_stage",
      version: "0.1.0",
      label: { zh: "舞台/idol 妆", en: "Stage / idol makeup" },
      plain: { zh: "舞台或偶像感，眼妆闪亮、底妆无瑕、上镜感强", en: "Stage or idol look with sparkling eyes, flawless base, camera-ready" },
      professionalTerms: ["idol makeup", "stage makeup", "camera-ready beauty"],
      promptFragment: { zh: "舞台偶像妆容，眼妆闪亮、底妆无瑕，上镜感强", en: "idol stage makeup with sparkling eye makeup, flawless base, strong camera-ready presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_makeup:anime_style",
      version: "0.1.0",
      label: { zh: "二次元妆感", en: "Anime-style makeup" },
      plain: { zh: "偏二次元角色的腮红、眼线与唇色，可爱或清冷", en: "Anime-influenced blush, liner, and lip color, cute or cool" },
      professionalTerms: ["anime makeup", "2D beauty styling", "character makeup"],
      promptFragment: { zh: "二次元风格妆感，腮红与眼线清晰，唇色干净，角色感强", en: "anime-style makeup with clear blush and eyeliner, clean lip color, strong character styling" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
