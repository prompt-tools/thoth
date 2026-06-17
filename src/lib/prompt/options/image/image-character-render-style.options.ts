import type { OptionSet } from "../../types";

export const imageCharacterRenderStyleOptions: OptionSet = {
  id: "image_character_render_style",
  version: "0.1.0",
  label: { zh: "角色呈现风格", en: "Character render style" },
  options: [
    {
      id: "image_character_render_style:realistic_portrait",
      version: "0.1.0",
      label: { zh: "真实写真", en: "Realistic portrait" },
      plain: { zh: "接近真实摄影的人像效果", en: "Close to real portrait photography" },
      professionalTerms: ["realistic portrait", "portrait photography", "real skin texture"],
      promptFragment: { zh: "真实人像写真呈现，肤质自然，光影接近专业摄影", en: "realistic portrait photography rendering with natural skin texture and professional lighting" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:semi_realistic",
      version: "0.1.0",
      label: { zh: "半写实", en: "Semi-realistic" },
      plain: { zh: "真人比例和插画审美结合", en: "Blend of realistic proportions and illustration aesthetics" },
      professionalTerms: ["semi-realistic", "stylized realism", "semi-real character art"],
      promptFragment: { zh: "半写实角色呈现，真人比例结合精致插画审美", en: "semi-realistic character rendering combining human proportions with refined illustration aesthetics" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:anime_key_visual",
      version: "0.1.0",
      label: { zh: "日系动画 Key Visual", en: "Anime key visual" },
      plain: { zh: "动画宣传图、主视觉风格", en: "Anime promotional key visual style" },
      professionalTerms: ["anime key visual", "anime promo art", "clean anime rendering"],
      promptFragment: { zh: "日系动画主视觉呈现，线条干净，色彩明快，角色眼神表现突出", en: "anime key visual rendering with clean lines, vivid colors, and expressive character eyes" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:otome_cg",
      version: "0.1.0",
      label: { zh: "乙游 CG", en: "Otome CG" },
      plain: { zh: "恋爱游戏剧情 CG，强调眼神和互动", en: "Romance game CG emphasizing gaze and interaction" },
      professionalTerms: ["otome CG", "romance CG", "visual novel CG", "female POV"],
      promptFragment: { zh: "乙游剧情 CG 呈现，眼神交流强，氛围浪漫沉浸", en: "otome story CG rendering with strong eye contact and romantic immersive atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:gacha_splash_art",
      version: "0.1.0",
      label: { zh: "手游卡面/立绘", en: "Gacha splash art" },
      plain: { zh: "适合抽卡角色、立绘和宣传图", en: "For gacha characters, standing art, and promo visuals" },
      professionalTerms: ["gacha splash art", "character card art", "standing illustration", "mobile game art"],
      promptFragment: { zh: "手游卡面或角色立绘呈现，造型华丽，细节密度高，角色辨识度强", en: "gacha splash art or standing illustration with ornate styling, high detail density, and strong character recognizability" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:novel_cover",
      version: "0.1.0",
      label: { zh: "小说封面感", en: "Novel cover" },
      plain: { zh: "封面式构图，人物有故事悬念", en: "Cover-like composition with story intrigue" },
      professionalTerms: ["novel cover art", "book cover portrait", "story cover character"],
      promptFragment: { zh: "小说封面式人物呈现，构图聚焦，角色带强故事悬念", en: "novel-cover character rendering with focused composition and strong narrative intrigue" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:character_sheet",
      version: "0.1.0",
      label: { zh: "角色设定表", en: "Character sheet" },
      plain: { zh: "干净背景，突出全身设定和服饰细节", en: "Clean background emphasizing full-body design and outfit details" },
      professionalTerms: ["character sheet", "model sheet", "character design sheet"],
      promptFragment: { zh: "角色设定表呈现，背景干净，完整展示身形、服装和关键配饰", en: "character sheet rendering with clean background, showing full body, outfit, and key accessories clearly" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_render_style:vtuber_avatar",
      version: "0.1.0",
      label: { zh: "VTuber/头像", en: "VTuber / avatar" },
      plain: { zh: "适合虚拟主播头像、半身或立绘", en: "For VTuber avatar, bust, or standing art" },
      professionalTerms: ["VTuber avatar", "Live2D avatar", "avatar portrait"],
      promptFragment: { zh: "VTuber 或头像式呈现，脸部辨识度高，轮廓清晰，适合头像和半身立绘", en: "VTuber or avatar-style rendering with high facial recognizability, clear silhouette, suitable for avatar and bust art" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
