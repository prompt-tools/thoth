import type { OptionSet } from "../../types";

export const imageSubjectOptions: OptionSet = {
  id: "image_subject",
  version: "0.1.0",
  label: { zh: "主体类型", en: "Subject type" },
  categories: [
    {
      id: "cat:image_subject:people",
      label: { zh: "人物", en: "People" },
      optionIds: ["image_subject:single_person", "image_subject:group_portrait", "image_subject:character_design", "image_subject:silhouette_figure"]
    },
    {
      id: "cat:image_subject:product",
      label: { zh: "产品", en: "Product" },
      optionIds: ["image_subject:hero_product", "image_subject:tech_product", "image_subject:beauty_product", "image_subject:fashion_accessory"]
    },
    {
      id: "cat:image_subject:animal",
      label: { zh: "动物", en: "Animal" },
      optionIds: ["image_subject:pet_animal", "image_subject:wildlife"]
    },
    {
      id: "cat:image_subject:nature",
      label: { zh: "自然风景", en: "Nature / Landscape" },
      optionIds: ["image_subject:natural_landscape", "image_subject:cityscape", "image_subject:skyscape"]
    },
    {
      id: "cat:image_subject:architecture",
      label: { zh: "建筑空间", en: "Architecture / Space" },
      optionIds: ["image_subject:interior_space", "image_subject:architectural_exterior"]
    },
    {
      id: "cat:image_subject:food",
      label: { zh: "食物", en: "Food" },
      optionIds: ["image_subject:food_beverage", "image_subject:plated_dish", "image_subject:dessert_beverage"]
    },
    {
      id: "cat:image_subject:abstract",
      label: { zh: "抽象概念", en: "Abstract" },
      optionIds: ["image_subject:geometric_abstract", "image_subject:organic_abstract"]
    },
    {
      id: "cat:image_subject:vehicle",
      label: { zh: "交通工具", en: "Vehicle" },
      optionIds: ["image_subject:vehicle_subject"]
    },
    {
      id: "cat:image_subject:botanical",
      label: { zh: "植物花卉", en: "Botanical / Flora" },
      optionIds: ["image_subject:botanical_flora"]
    }
  ],
  options: [
    // ── People (4 options) ──
    {
      id: "image_subject:single_person",
      version: "0.1.0",
      label: { zh: "单人", en: "Single person" },
      plain: { zh: "一个人物主体，居中或偏置构图", en: "A single person as the main subject" },
      professionalTerms: ["single subject portrait", "solo figure", "one person", "individual"],
      promptFragment: {
        zh: "单个主体人物，清晰的面部特征和服装细节",
        en: "a single person subject with clear facial features and clothing details"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:group_portrait",
      version: "0.1.0",
      label: { zh: "多人/群像", en: "Group portrait" },
      plain: { zh: "两人或多个人物同框的群像照片", en: "Two or more people in a group shot" },
      professionalTerms: ["group portrait", "multiple subjects", "crowd scene", "ensemble"],
      promptFragment: {
        zh: "多人同框的群像场景，人物之间的互动和空间关系清晰",
        en: "a group portrait with multiple people, clear interaction and spatial relationship between subjects"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:character_design",
      version: "0.1.0",
      label: { zh: "角色设计", en: "Character design" },
      plain: { zh: "虚构/插画角色，完整人设展示", en: "A fictional/illustrated character with full design showcase" },
      professionalTerms: ["character design", "concept character", "original character", "OC", "turnaround"],
      promptFragment: {
        zh: "虚构角色设计，完整的服装、发型和造型展示",
        en: "a fictional character design with complete outfit, hairstyle, and styling showcase"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:silhouette_figure",
      version: "0.1.0",
      label: { zh: "剪影人物", en: "Silhouette figure" },
      plain: { zh: "人物以剪影/轮廓形式出现，不露面部细节", en: "A person shown as a silhouette without facial detail" },
      professionalTerms: ["silhouette", "backlit figure", "contre-jour", "outline figure"],
      promptFragment: {
        zh: "人物以剪影形式出现，只显示轮廓和姿态，面部细节不可见",
        en: "a person shown as a silhouette, revealing only the outline and posture without facial details"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Product (4 options) ──
    {
      id: "image_subject:hero_product",
      version: "0.1.0",
      label: { zh: "产品主角", en: "Hero product" },
      plain: { zh: "产品作为画面唯一视觉焦点", en: "The product as the sole visual focal point" },
      professionalTerms: ["product hero", "packshot", "single product", "commercial product"],
      promptFragment: {
        zh: "产品作为画面主角，突出外观设计、材质和品牌标识",
        en: "the product as the hero element, emphasizing design, materials, and brand identity"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:tech_product",
      version: "0.1.0",
      label: { zh: "科技产品", en: "Tech product" },
      plain: { zh: "手机、电脑、耳机等消费电子产品", en: "Consumer electronics like phones, laptops, headphones" },
      professionalTerms: ["tech product", "consumer electronics", "gadget", "device", "hardware"],
      promptFragment: {
        zh: "科技产品展示，突出屏幕显示、金属/玻璃材质和现代感设计",
        en: "a tech product showcase emphasizing the screen display, metal/glass materials, and modern design"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:beauty_product",
      version: "0.1.0",
      label: { zh: "美妆产品", en: "Beauty product" },
      plain: { zh: "化妆品、护肤品等美容类产品", en: "Cosmetics, skincare, and beauty products" },
      professionalTerms: ["beauty product", "cosmetics", "skincare", "luxury packaging", "makeup"],
      promptFragment: {
        zh: "美妆产品展示，突出精致包装、液体质感和品牌调性",
        en: "a beauty product showcase with refined packaging, liquid textures, and brand aesthetic"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:fashion_accessory",
      version: "0.1.0",
      label: { zh: "时尚配饰", en: "Fashion accessory" },
      plain: { zh: "手表、包包、首饰等时尚穿戴类产品", en: "Watches, bags, jewelry, and fashion wearables" },
      professionalTerms: ["fashion accessory", "luxury goods", "jewelry", "wearable", "premium"],
      promptFragment: {
        zh: "时尚配饰展示，突出材质光泽、细节工艺和佩戴效果",
        en: "a fashion accessory showcase with material sheen, detailed craftsmanship, and styling effect"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Animal (2 options) ──
    {
      id: "image_subject:pet_animal",
      version: "0.1.0",
      label: { zh: "宠物", en: "Pet" },
      plain: { zh: "可爱宠物（猫、狗等），温馨家庭感", en: "Adorable pet (cat, dog, etc.) with warm domestic feel" },
      professionalTerms: ["pet portrait", "companion animal", "domestic pet", "cute animal"],
      promptFragment: {
        zh: "可爱的宠物形象，温馨自然的表情和姿态",
        en: "an adorable pet with a warm, natural expression and pose"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:wildlife",
      version: "0.1.0",
      label: { zh: "野生动物", en: "Wildlife" },
      plain: { zh: "自然环境中的野生动物", en: "Wild animals in their natural habitat" },
      professionalTerms: ["wildlife photography", "animal in nature", "safari subject", "fauna"],
      promptFragment: {
        zh: "自然环境中的野生动物，展现其原生栖息地和生活状态",
        en: "wildlife in its natural environment, showcasing native habitat and natural behavior"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Nature / Landscape (3 options) ──
    {
      id: "image_subject:natural_landscape",
      version: "0.1.0",
      label: { zh: "自然风景", en: "Natural landscape" },
      plain: { zh: "山水、海洋、森林等自然景观", en: "Mountains, ocean, forest, and natural vistas" },
      professionalTerms: ["landscape", "natural landscape", "nature scene", "natural vista", "scenic"],
      promptFragment: {
        zh: "自然风景画面，展现山川、海洋或森林的壮丽景观",
        en: "a natural landscape scene showcasing the grandeur of mountains, ocean, or forest"
      },
      appliesTo: ["generic_image"],
      consumerTerms: ["自然风光", "自然风景", "山水"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:cityscape",
      version: "0.1.0",
      label: { zh: "城市景观", en: "Cityscape" },
      plain: { zh: "城市天际线、街道、建筑群", en: "City skyline, streets, architectural clusters" },
      professionalTerms: ["cityscape", "urban landscape", "skyline", "metropolitan", "street scene"],
      promptFragment: {
        zh: "城市景观，展现建筑群、街道天际线和都市氛围",
        en: "a cityscape showing architectural clusters, street skylines, and urban atmosphere"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:skyscape",
      version: "0.1.0",
      label: { zh: "天空/云景", en: "Skyscape" },
      plain: { zh: "天空为主体，云朵、日出日落、星空", en: "Sky as the main subject with clouds, sunrise/sunset, or stars" },
      professionalTerms: ["skyscape", "cloudscape", "aerial view", "atmospheric sky", "celestial"],
      promptFragment: {
        zh: "以天空为主体的画面，展现云层、霞光或星空景观",
        en: "a skyscape composition with the sky as the main subject, showing clouds, twilight, or stars"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Architecture / Space (2 options) ──
    {
      id: "image_subject:interior_space",
      version: "0.1.0",
      label: { zh: "室内空间", en: "Interior space" },
      plain: { zh: "室内设计、家居、商业空间", en: "Interior design, home, or commercial space" },
      professionalTerms: ["interior design", "room scene", "indoor space", "architectural interior", "living space"],
      promptFragment: {
        zh: "室内空间设计，展现布局、材质搭配和氛围照明",
        en: "an interior space design showing layout, material combinations, and ambient lighting"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:architectural_exterior",
      version: "0.1.0",
      label: { zh: "建筑外观", en: "Architectural exterior" },
      plain: { zh: "建筑物外观，现代或历史建筑", en: "Building exterior, modern or historical architecture" },
      professionalTerms: ["architectural exterior", "building facade", "structure", "modern architecture", "heritage"],
      promptFragment: {
        zh: "建筑外观，展现结构形态、外立面和与环境的关系",
        en: "an architectural exterior showcasing structural form, facade, and environmental context"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Food (3 options) ──
    {
      id: "image_subject:food_beverage",
      version: "0.1.0",
      label: { zh: "食品饮品", en: "Food & beverage" },
      plain: { zh: "各类食物和饮品，突出诱人质感", en: "Various foods and drinks with appetizing texture" },
      professionalTerms: ["food photography", "beverage shot", "culinary", "appetizing", "gastronomy"],
      promptFragment: {
        zh: "食品饮品展示，突出色彩、质感和新鲜度",
        en: "a food and beverage showcase emphasizing color, texture, and freshness"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:plated_dish",
      version: "0.1.0",
      label: { zh: "精致摆盘", en: "Plated dish" },
      plain: { zh: "餐厅级别的精致摆盘菜肴", en: "Restaurant-quality plated dish presentation" },
      professionalTerms: ["plated dish", "fine dining", "gourmet plating", "chef presentation", "culinary art"],
      promptFragment: {
        zh: "精致摆盘的菜肴，餐厅级别的摆盘艺术和食材质感",
        en: "a beautifully plated dish with restaurant-quality presentation and ingredient textures"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:dessert_beverage",
      version: "0.1.0",
      label: { zh: "甜点饮品", en: "Dessert & drink" },
      plain: { zh: "蛋糕、冰淇淋、咖啡、茶饮等", en: "Cakes, ice cream, coffee, tea, and beverages" },
      professionalTerms: ["dessert photography", "pastry", "beverage styling", "sweet treat", "cafe"],
      promptFragment: {
        zh: "甜点和饮品展示，突出诱人外观、装饰细节和舒适氛围",
        en: "a dessert and drink showcase with enticing appearance, decorative details, and cozy atmosphere"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Abstract (2 options) ──
    {
      id: "image_subject:geometric_abstract",
      version: "0.1.0",
      label: { zh: "几何抽象", en: "Geometric abstract" },
      plain: { zh: "几何形状、线条、色块构成的抽象画面", en: "Abstract composition of geometric shapes, lines, and color blocks" },
      professionalTerms: ["geometric abstract", "shape composition", "non-representational", "minimal geometry", "color field"],
      promptFragment: {
        zh: "几何抽象构图，由简洁的形状、线条和色块组成",
        en: "a geometric abstract composition of clean shapes, lines, and color blocks"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_subject:organic_abstract",
      version: "0.1.0",
      label: { zh: "有机抽象", en: "Organic abstract" },
      plain: { zh: "流动曲线、生物形态的抽象画面", en: "Flowing curves and biomorphic abstract composition" },
      professionalTerms: ["organic abstract", "fluid form", "biomorphic", "flowing shape", "abstract sculpture"],
      promptFragment: {
        zh: "有机抽象画面，流动的曲线和生物形态的视觉语言",
        en: "an organic abstract composition with flowing curves and biomorphic visual language"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Vehicle (1 option) ──
    {
      id: "image_subject:vehicle_subject",
      version: "0.1.0",
      label: { zh: "交通工具", en: "Vehicle" },
      plain: { zh: "汽车、摩托车、飞机等交通工具", en: "Cars, motorcycles, aircraft, and vehicles" },
      professionalTerms: ["vehicle photography", "automotive", "car design", "transport", "motion machine"],
      promptFragment: {
        zh: "交通工具展示，突出造型线条、漆面质感和动态姿态",
        en: "a vehicle showcase with sculpted body lines, paint finish, and dynamic stance"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    // ── Botanical / Flora (1 option) ──
    {
      id: "image_subject:botanical_flora",
      version: "0.1.0",
      label: { zh: "植物花卉", en: "Botanical / flora" },
      plain: { zh: "花卉特写、植物、花园景观", en: "Flower close-ups, plants, garden scenes" },
      professionalTerms: ["botanical", "flora", "flower close-up", "plant life", "garden", "macro flower"],
      promptFragment: {
        zh: "植物花卉画面，展现花瓣纹理、枝叶形态和自然生机",
        en: "a botanical scene with flower textures, foliage forms, and natural vitality"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
