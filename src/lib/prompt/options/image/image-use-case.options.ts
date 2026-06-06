import type { OptionSet } from "../../types";

export const imageUseCaseOptions: OptionSet = {
  id: "image_use_case",
  version: "0.1.0",
  label: { zh: "图片用途", en: "Image use case" },
  categories: [
    {
      id: "cat:image_use_case:personal",
      label: { zh: "个人使用", en: "Personal" },
      optionIds: [
        "image_use_case:avatar",
        "image_use_case:wallpaper",
        "image_use_case:greeting_card",
        "image_use_case:invitation"
      ]
    },
    {
      id: "cat:image_use_case:biz",
      label: { zh: "宣传物料", en: "Promotional" },
      optionIds: [
        "image_use_case:poster",
        "image_use_case:banner",
        "image_use_case:packaging",
        "image_use_case:print_material"
      ]
    },
    {
      id: "cat:image_use_case:social",
      label: { zh: "社交媒体", en: "Social media" },
      optionIds: [
        "image_use_case:social_media_post",
        "image_use_case:thumbnail",
        "image_use_case:cover_image"
      ]
    },
    {
      id: "cat:image_use_case:ecommerce",
      label: { zh: "电商/产品", en: "E-commerce" },
      optionIds: [
        "image_use_case:product_photo",
        "image_use_case:ecommerce_main"
      ]
    },
    {
      id: "cat:image_use_case:design",
      label: { zh: "专业设计", en: "Professional design" },
      optionIds: [
        "image_use_case:illustration",
        "image_use_case:logo_icon",
        "image_use_case:menu",
        "image_use_case:print_material",
        "image_use_case:presentation_image",
        "image_use_case:article_hero"
      ]
    }
  ],
  options: [
    // ── 1. poster ──
    {
      id: "image_use_case:poster",
      version: "0.1.0",
      label: { zh: "海报", en: "Poster" },
      plain: { zh: "宣传海报，需要大胆构图和标题空间", en: "Promotional poster with bold composition and headline space" },
      professionalTerms: ["promotional poster", "bold composition", "headline space", "advertising visual", "print-ready"],
      promptFragment: {
        zh: "宣传海报风格，构图大胆，适合添加标题和文字叠加",
        en: "promotional poster layout with bold composition, suitable for headlines and text overlay"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product", "image_subject:single_person"],
        composition: ["image_composition:centered", "image_composition:symmetrical"],
        lighting: ["image_lighting:cinematic", "image_lighting:hard_dramatic"],
        art_style: ["image_art_style:digital_painting", "image_art_style:vector_flat", "image_art_style:photorealistic"],
        color_palette: ["image_color_palette:vibrant", "image_color_palette:complementary"],
        mood: ["image_mood:epic_grand", "image_mood:cool_sleek"],
        aspect_ratio: ["image_aspect_ratio:portrait_2_3"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 2. cover_image ──
    {
      id: "image_use_case:cover_image",
      version: "0.1.0",
      label: { zh: "封面图", en: "Cover image" },
      plain: { zh: "文章/视频/网页封面，需要视觉焦点和文字空间", en: "Article/video/web cover with visual focal point and text overlay space" },
      professionalTerms: ["cover image", "hero image", "thumbnail", "focal point", "text overlay space"],
      promptFragment: {
        zh: "封面图布局，视觉焦点突出，留有文字叠加空间",
        en: "cover image layout with prominent focal point and space for text overlay"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product", "image_subject:single_person"],
        composition: ["image_composition:centered", "image_composition:negative_space"],
        color_palette: ["image_color_palette:vibrant", "image_color_palette:complementary"],
        mood: ["image_mood:epic_grand", "image_mood:mysterious"],
        aspect_ratio: ["image_aspect_ratio:landscape_16_9"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 3. product_photo ──
    {
      id: "image_use_case:product_photo",
      version: "0.1.0",
      label: { zh: "产品图", en: "Product photo" },
      plain: { zh: "干净的产品展示，白色/工作室背景", en: "Clean product showcase with white/studio background" },
      professionalTerms: ["product photography", "clean showcase", "studio background", "commercial packshot", "e-commerce"],
      promptFragment: {
        zh: "产品摄影风格，干净背景，突出产品外观和材质细节",
        en: "product photography with clean background, highlighting product appearance and material details"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product"],
        scene: ["image_scene:white_bg", "image_scene:studio_env"],
        composition: ["image_composition:centered"],
        lighting: ["image_lighting:studio_clean"],
        art_style: ["image_art_style:product_photography", "image_art_style:minimalist"],
        color_palette: ["image_color_palette:muted", "image_color_palette:monochrome"],
        aspect_ratio: ["image_aspect_ratio:square_1_1"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 4. avatar ──
    {
      id: "image_use_case:avatar",
      version: "0.1.0",
      label: { zh: "头像", en: "Avatar" },
      plain: { zh: "个人头像，面部居中，背景干净", en: "Profile picture with centered face and clean background" },
      professionalTerms: ["profile picture", "avatar", "centered face", "clean background", "portrait"],
      promptFragment: {
        zh: "头像风格，面部居中，背景简洁干净",
        en: "avatar portrait with centered face and clean, simple background"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:single_person"],
        scene: ["image_scene:solid_color"],
        composition: ["image_composition:centered", "image_composition:fill_frame"],
        lighting: ["image_lighting:window_soft", "image_lighting:rembrandt"],
        art_style: ["image_art_style:portrait_photography"],
        color_palette: ["image_color_palette:monochrome", "image_color_palette:muted"],
        mood: ["image_mood:warm_cozy"],
        aspect_ratio: ["image_aspect_ratio:square_1_1"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 5. wallpaper ──
    {
      id: "image_use_case:wallpaper",
      version: "0.1.0",
      label: { zh: "壁纸", en: "Wallpaper" },
      plain: { zh: "屏幕背景，无需文字，放松或激励感", en: "Screen background without text, relaxing or inspiring feel" },
      professionalTerms: ["wallpaper", "screen background", "no text", "relaxing", "inspiring", "decorative"],
      promptFragment: {
        zh: "壁纸风格，无需文字元素，画面放松或富有激励感",
        en: "wallpaper design without text elements, with a relaxing or inspiring visual mood"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:natural_landscape"],
        scene: ["image_scene:natural_landscape", "image_scene:sky_cloud"],
        composition: ["image_composition:rule_of_thirds"],
        lighting: ["image_lighting:golden_hour", "image_lighting:blue_hour"],
        art_style: ["image_art_style:minimalist", "image_art_style:digital_painting"],
        color_palette: ["image_color_palette:pastel", "image_color_palette:muted"],
        mood: ["image_mood:serene", "image_mood:hopeful_bright"],
        aspect_ratio: ["image_aspect_ratio:landscape_16_9"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 6. illustration ──
    {
      id: "image_use_case:illustration",
      version: "0.1.0",
      label: { zh: "插画", en: "Illustration" },
      plain: { zh: "艺术插画，适合文章、书籍和应用配图", en: "Artistic illustration for articles, books, and app decoration" },
      professionalTerms: ["illustration", "editorial art", "book illustration", "app art", "decorative"],
      promptFragment: {
        zh: "艺术插画风格，适合文章配图、书籍插图和装饰用途",
        en: "artistic illustration suitable for articles, books, and decorative use"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:character_design", "image_subject:geometric_abstract"],
        art_style: ["image_art_style:digital_painting", "image_art_style:watercolor", "image_art_style:vector_flat"],
        color_palette: ["image_color_palette:vibrant", "image_color_palette:pastel"],
        mood: ["image_mood:playful_cute", "image_mood:serene"],
        detail_level: ["image_detail_level:simplified", "image_detail_level:moderate"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 7. logo_icon ──
    {
      id: "image_use_case:logo_icon",
      version: "0.1.0",
      label: { zh: "Logo/图标", en: "Logo / icon" },
      plain: { zh: "符号化设计，扁平色彩，简洁几何", en: "Symbolic design with flat colors and simple geometry" },
      professionalTerms: ["logo design", "icon design", "symbol", "flat color", "simple geometry", "scalable"],
      promptFragment: {
        zh: "Logo/图标设计风格，扁平简洁几何造型，符号化表达",
        en: "logo or icon design with flat, simple geometric shapes and symbolic expression"
      },
      appliesTo: ["generic_image"],
      suggests: {
        composition: ["image_composition:centered", "image_composition:negative_space"],
        art_style: ["image_art_style:minimalist", "image_art_style:vector_flat"],
        color_palette: ["image_color_palette:monochrome", "image_color_palette:complementary"],
        mood: ["image_mood:cool_sleek"],
        aspect_ratio: ["image_aspect_ratio:square_1_1"],
        detail_level: ["image_detail_level:simplified", "image_detail_level:minimalist"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 8. banner ──
    {
      id: "image_use_case:banner",
      version: "0.1.0",
      label: { zh: "横幅", en: "Banner" },
      plain: { zh: "网页横幅，宽幅格式，文字叠加空间", en: "Web banner in wide format with text overlay space" },
      professionalTerms: ["web banner", "wide format", "text overlay", "advertising", "hero banner"],
      promptFragment: {
        zh: "网页横幅布局，宽幅格式，适合文字叠加和品牌元素",
        en: "web banner layout in wide format, suitable for text overlay and brand elements"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product", "image_subject:single_person"],
        composition: ["image_composition:negative_space", "image_composition:centered"],
        aspect_ratio: ["image_aspect_ratio:landscape_16_9", "image_aspect_ratio:ultra_wide_2_1"],
        color_palette: ["image_color_palette:vibrant", "image_color_palette:complementary"],
        mood: ["image_mood:epic_grand", "image_mood:cool_sleek"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 9. social_media_post ──
    {
      id: "image_use_case:social_media_post",
      version: "0.1.0",
      label: { zh: "社媒配图", en: "Social media post" },
      plain: { zh: "Instagram/小红书/微信朋友圈配图", en: "Social media post image for Instagram, RedNote, WeChat feeds" },
      professionalTerms: ["social media post", "Instagram", "RedNote", "WeChat", "feed image", "platform-ready"],
      promptFragment: {
        zh: "社交媒体配图，适合社交平台信息流展示",
        en: "social media post image optimized for platform feed display"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:single_person", "image_subject:food_beverage"],
        composition: ["image_composition:fill_frame"],
        lighting: ["image_lighting:window_soft"],
        art_style: ["image_art_style:fashion_photography", "image_art_style:film_photography"],
        color_palette: ["image_color_palette:vibrant", "image_color_palette:warm"],
        mood: ["image_mood:joyful_energetic", "image_mood:warm_cozy"],
        aspect_ratio: ["image_aspect_ratio:square_1_1", "image_aspect_ratio:portrait_4_5"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 10. thumbnail ──
    {
      id: "image_use_case:thumbnail",
      version: "0.1.0",
      label: { zh: "缩略图", en: "Thumbnail" },
      plain: { zh: "YouTube/视频缩略图，高对比度，表情丰富", en: "YouTube/video thumbnail with high contrast and expressive elements" },
      professionalTerms: ["YouTube thumbnail", "video thumbnail", "high contrast", "expressive", "clickable", "eye-catching"],
      promptFragment: {
        zh: "视频缩略图风格，高对比度、表情丰富、吸引点击",
        en: "video thumbnail with high contrast, expressive elements, and click appeal"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:single_person", "image_subject:hero_product"],
        composition: ["image_composition:centered", "image_composition:fill_frame"],
        lighting: ["image_lighting:high_key", "image_lighting:hard_dramatic"],
        art_style: ["image_art_style:photorealistic", "image_art_style:digital_painting"],
        color_palette: ["image_color_palette:vibrant", "image_color_palette:complementary"],
        mood: ["image_mood:epic_grand", "image_mood:joyful_energetic"],
        aspect_ratio: ["image_aspect_ratio:landscape_16_9"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 11. ecommerce_main ──
    {
      id: "image_use_case:ecommerce_main",
      version: "0.1.0",
      label: { zh: "电商主图", en: "E-commerce main image" },
      plain: { zh: "产品在白色背景上，电商标准", en: "Product on white background, marketplace standard" },
      professionalTerms: ["e-commerce main image", "product on white", "marketplace standard", "clean", "professional"],
      promptFragment: {
        zh: "电商主图风格，产品在纯白背景上，符合电商平台标准",
        en: "e-commerce main image with product on pure white background, marketplace standard"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product"],
        scene: ["image_scene:white_bg"],
        composition: ["image_composition:centered"],
        lighting: ["image_lighting:studio_clean"],
        art_style: ["image_art_style:product_photography"],
        color_palette: ["image_color_palette:monochrome", "image_color_palette:muted"],
        mood: ["image_mood:cool_sleek"],
        aspect_ratio: ["image_aspect_ratio:square_1_1"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 12. greeting_card ──
    {
      id: "image_use_case:greeting_card",
      version: "0.1.0",
      label: { zh: "贺卡", en: "Greeting card" },
      plain: { zh: "节日/庆祝贺卡，有文字空间", en: "Festive/celebratory card with space for message text" },
      professionalTerms: ["greeting card", "festive", "celebratory", "text space", "warm", "seasonal"],
      promptFragment: {
        zh: "贺卡风格，节日或庆祝氛围，留有祝福文字空间",
        en: "greeting card design with festive or celebratory mood and space for message text"
      },
      appliesTo: ["generic_image"],
      suggests: {
        composition: ["image_composition:centered", "image_composition:symmetrical"],
        lighting: ["image_lighting:golden_hour", "image_lighting:soft_dreamy"],
        art_style: ["image_art_style:watercolor", "image_art_style:digital_painting"],
        color_palette: ["image_color_palette:warm", "image_color_palette:pastel"],
        mood: ["image_mood:warm_cozy", "image_mood:joyful_energetic"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 13. presentation_image ──
    {
      id: "image_use_case:presentation_image",
      version: "0.1.0",
      label: { zh: "PPT配图", en: "Presentation image" },
      plain: { zh: "幻灯片插图，最小干扰，概念驱动", en: "Slide illustration with minimal distraction, concept-driven" },
      professionalTerms: ["presentation image", "slide illustration", "minimal distraction", "concept-driven", "clean", "professional"],
      promptFragment: {
        zh: "PPT配图风格，简洁专业，以概念传达为主，减少视觉干扰",
        en: "presentation slide illustration that is clean, professional, and concept-driven with minimal visual distraction"
      },
      appliesTo: ["generic_image"],
      suggests: {
        composition: ["image_composition:negative_space", "image_composition:centered"],
        lighting: ["image_lighting:studio_clean"],
        art_style: ["image_art_style:minimalist", "image_art_style:vector_flat"],
        color_palette: ["image_color_palette:sophisticated_gray", "image_color_palette:cool"],
        mood: ["image_mood:cool_sleek"],
        aspect_ratio: ["image_aspect_ratio:landscape_16_9"],
        detail_level: ["image_detail_level:simplified", "image_detail_level:moderate"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 14. article_hero ──
    {
      id: "image_use_case:article_hero",
      version: "0.1.0",
      label: { zh: "文章头图", en: "Article hero" },
      plain: { zh: "博客/文章头图，引发好奇心", en: "Blog/article header image that sparks curiosity" },
      professionalTerms: ["article hero", "blog header", "curiosity-driven", "engaging", "editorial"],
      promptFragment: {
        zh: "文章头图风格，引发好奇心，与文章主题呼应",
        en: "article hero image that sparks curiosity and reflects the article theme"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:geometric_abstract", "image_subject:natural_landscape"],
        composition: ["image_composition:rule_of_thirds", "image_composition:negative_space"],
        lighting: ["image_lighting:cinematic", "image_lighting:golden_hour"],
        art_style: ["image_art_style:digital_painting", "image_art_style:photorealistic"],
        color_palette: ["image_color_palette:sophisticated_gray", "image_color_palette:cool"],
        mood: ["image_mood:epic_grand", "image_mood:mysterious"],
        aspect_ratio: ["image_aspect_ratio:landscape_16_9"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 15. packaging ──
    {
      id: "image_use_case:packaging",
      version: "0.1.0",
      label: { zh: "包装设计", en: "Packaging design" },
      plain: { zh: "产品包装效果图或图案设计", en: "Product packaging mockup or pattern design" },
      professionalTerms: ["packaging design", "product mockup", "pattern design", "brand identity", "label"],
      promptFragment: {
        zh: "包装设计风格，展示产品包装外观和图案设计",
        en: "packaging design mockup showcasing product packaging appearance and pattern"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product"],
        composition: ["image_composition:centered", "image_composition:flat_lay"],
        lighting: ["image_lighting:studio_clean", "image_lighting:soft_dreamy"],
        art_style: ["image_art_style:product_photography", "image_art_style:minimalist"],
        color_palette: ["image_color_palette:muted", "image_color_palette:pastel"],
        mood: ["image_mood:cool_sleek"],
        aspect_ratio: ["image_aspect_ratio:square_1_1", "image_aspect_ratio:portrait_3_4"],
        detail_level: ["image_detail_level:high_detail"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 16. menu ──
    {
      id: "image_use_case:menu",
      version: "0.1.0",
      label: { zh: "菜单", en: "Menu" },
      plain: { zh: "食品菜单，展示菜品图像", en: "Food menu with prominent dish showcase" },
      professionalTerms: ["food menu", "dish showcase", "culinary", "restaurant", "appetizing"],
      promptFragment: {
        zh: "菜单设计风格，突出菜品展示和诱人质感",
        en: "menu design with prominent dish showcase and appetizing visual appeal"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:food_beverage", "image_subject:plated_dish"],
        scene: ["image_scene:indoor_setting"],
        composition: ["image_composition:centered", "image_composition:flat_lay"],
        lighting: ["image_lighting:soft_dreamy", "image_lighting:warm_lamp"],
        art_style: ["image_art_style:food_photography"],
        color_palette: ["image_color_palette:warm", "image_color_palette:vibrant"],
        mood: ["image_mood:warm_cozy", "image_mood:joyful_energetic"],
        perspective: ["image_perspective:top_down"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 17. invitation ──
    {
      id: "image_use_case:invitation",
      version: "0.1.0",
      label: { zh: "邀请函", en: "Invitation" },
      plain: { zh: "活动邀请函，优雅设计", en: "Event invitation with elegant design" },
      professionalTerms: ["event invitation", "elegant design", "formal", "celebratory", "decorative"],
      promptFragment: {
        zh: "邀请函设计风格，优雅正式，适合活动邀请场景",
        en: "invitation design with elegant, formal aesthetic for event occasions"
      },
      appliesTo: ["generic_image"],
      suggests: {
        composition: ["image_composition:centered", "image_composition:symmetrical"],
        lighting: ["image_lighting:soft_dreamy", "image_lighting:candlelight"],
        art_style: ["image_art_style:art_deco", "image_art_style:minimalist", "image_art_style:watercolor"],
        color_palette: ["image_color_palette:jewel_tones", "image_color_palette:pastel"],
        mood: ["image_mood:luxurious_premium", "image_mood:warm_cozy"]
      },
      riskHint: { zh: "", en: "" }
    },
    // ── 18. print_material ──
    {
      id: "image_use_case:print_material",
      version: "0.1.0",
      label: { zh: "印刷品", en: "Print material" },
      plain: { zh: "高分辨率印刷品（画册、传单、海报）", en: "High-resolution print material for brochures, flyers, posters" },
      professionalTerms: ["print material", "high resolution", "brochure", "flyer", "physical print", "300dpi"],
      promptFragment: {
        zh: "印刷品设计风格，高分辨率，适合画册、传单等实体印刷",
        en: "print material design at high resolution, suitable for brochures, flyers, and physical printing"
      },
      appliesTo: ["generic_image"],
      suggests: {
        subject: ["image_subject:hero_product"],
        composition: ["image_composition:centered"],
        lighting: ["image_lighting:studio_clean"],
        art_style: ["image_art_style:minimalist", "image_art_style:photorealistic"],
        color_palette: ["image_color_palette:sophisticated_gray", "image_color_palette:muted"],
        mood: ["image_mood:cool_sleek"],
        aspect_ratio: ["image_aspect_ratio:portrait_3_4", "image_aspect_ratio:landscape_4_3"],
        detail_level: ["image_detail_level:hyper_detailed", "image_detail_level:high_detail"]
      },
      riskHint: { zh: "", en: "" }
    }
  ]
};
