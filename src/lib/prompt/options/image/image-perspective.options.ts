import type { OptionSet } from "../../types";

export const imagePerspectiveOptions: OptionSet = {
  id: "image_perspective",
  version: "0.1.0",
  label: { zh: "视角/镜头角度", en: "Perspective / Camera angle" },
  categories: [
    {
      id: "cat:image_perspective:angle",
      label: { zh: "拍摄角度", en: "Camera Angle" },
      optionIds: [
        "image_perspective:eye_level", "image_perspective:top_down", "image_perspective:aerial_view",
        "image_perspective:low_angle", "image_perspective:slight_low_angle", "image_perspective:slight_high_angle",
        "image_perspective:isometric_view", "image_perspective:dutch_angle"
      ]
    },
    {
      id: "cat:image_perspective:distance",
      label: { zh: "拍摄距离", en: "Shot Distance" },
      optionIds: [
        "image_perspective:fisheye", "image_perspective:macro_view", "image_perspective:close_up",
        "image_perspective:medium_shot", "image_perspective:wide_shot", "image_perspective:extreme_wide",
        "image_perspective:first_person", "image_perspective:over_the_shoulder"
      ]
    }
  ],
  options: [
    // ── Camera Angle ──
    {
      id: "image_perspective:eye_level",
      version: "0.1.0",
      label: { zh: "平视", en: "Eye level" },
      plain: { zh: "与主体等高的视角，自然中性，最接近人眼观察方式", en: "Camera at the same height as the subject, neutral and natural like human eye level" },
      professionalTerms: ["eye-level", "straight-on", "neutral", "natural", "face-on"],
      promptFragment: { zh: "平视视角，与主体等高，自然而中性的观察角度", en: "eye-level perspective at subject height, neutral and natural viewing angle" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:top_down",
      version: "0.1.0",
      label: { zh: "俯视/上帝视角", en: "Top-down / overhead" },
      plain: { zh: "从正上方向下看，平面布局清晰，有全局感", en: "Looking straight down from above, revealing layout and pattern with an omniscient feel" },
      professionalTerms: ["top-down", "bird's eye view", "overhead", "plan view", "aerial"],
      promptFragment: { zh: "俯视角度，从正上方向下看，全局清晰可见", en: "top-down perspective looking straight down, revealing the full layout from above" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:aerial_view",
      version: "0.1.0",
      label: { zh: "鸟瞰", en: "Aerial view" },
      plain: { zh: "从高处斜向下俯瞰，像无人机航拍效果", en: "High angle view from above, like a drone shot sweeping over the scene" },
      professionalTerms: ["aerial view", "drone shot", "high angle", "elevated", "sweeping"],
      promptFragment: { zh: "鸟瞰视角，像无人机从高处俯瞰，视野开阔", en: "aerial drone-like view from high above, sweeping over the scene with expansive vision" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:low_angle",
      version: "0.1.0",
      label: { zh: "仰视/低角度", en: "Low angle / heroic" },
      plain: { zh: "从低处向上看，让主体显得高大、有力量", en: "Looking up from below, making subjects appear towering and heroic" },
      professionalTerms: ["low angle", "worm's eye view", "heroic", "towering", "imposing"],
      promptFragment: { zh: "仰视低角度，主体显得高大伟岸，充满力量感", en: "low angle heroic perspective looking up, making the subject appear towering and powerful" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:slight_low_angle",
      version: "0.1.0",
      label: { zh: "略微仰视", en: "Slight low angle" },
      plain: { zh: "轻微仰视，给主体增添一点力量感而不过分夸张", en: "Subtle upward angle that adds a touch of empowerment without exaggeration" },
      professionalTerms: ["slight low angle", "empowering", "subtle upward", "grounded heroic"],
      promptFragment: { zh: "略微仰视的角度，轻微增强主体的力量感，自然不夸张", en: "slight low angle for a subtle empowering effect, natural and grounded" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:slight_high_angle",
      version: "0.1.0",
      label: { zh: "略微俯视", en: "Slight high angle" },
      plain: { zh: "轻微俯视，让主体显得更亲近平和", en: "Subtle downward angle that makes the subject feel approachable and intimate" },
      professionalTerms: ["slight high angle", "diminishing", "subtle overhead", "intimate"],
      promptFragment: { zh: "略微俯视的角度，亲切平和，拉近与主体的距离", en: "slight high angle for an intimate approachable feel, drawing the viewer closer" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:isometric_view",
      version: "0.1.0",
      label: { zh: "等角/等距", en: "Isometric view" },
      plain: { zh: "等角投影视角，常用于游戏和建筑表现，没有透视变形", en: "Isometric projection view without perspective distortion, common in games and architectural renders" },
      professionalTerms: ["isometric view", "2.5D", "axonometric", "game perspective"],
      promptFragment: { zh: "等角投影视角，无透视变形，游戏或建筑展示风格", en: "isometric view without perspective distortion, game-like or architectural presentation style" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:dutch_angle",
      version: "0.1.0",
      label: { zh: "倾斜/荷兰角", en: "Dutch angle / tilted" },
      plain: { zh: "有意倾斜画面，制造不安、动感或戏剧效果", en: "Intentionally tilted frame creating unease, dynamism, or dramatic effect" },
      professionalTerms: ["Dutch angle", "canted frame", "tilted", "unease", "off-kilter"],
      promptFragment: { zh: "倾斜构图，制造不安或动感，戏剧性视觉效果", en: "Dutch angle with tilted frame for unease and dramatic visual impact" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },

    // ── Shot Distance ──
    {
      id: "image_perspective:fisheye",
      version: "0.1.0",
      label: { zh: "鱼眼", en: "Fisheye" },
      plain: { zh: "超广角鱼眼镜头效果，球面畸变，夸张视觉", en: "Ultra-wide fisheye lens effect with spherical distortion for exaggerated visuals" },
      professionalTerms: ["fisheye lens", "ultra-wide distortion", "spherical", "exaggerated"],
      promptFragment: { zh: "鱼眼镜头效果，超广角球面畸变，夸张的视觉冲击", en: "fisheye lens effect with ultra-wide spherical distortion for exaggerated visual impact" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:macro_view",
      version: "0.1.0",
      label: { zh: "微距", en: "Macro view" },
      plain: { zh: "超近距离拍摄，展现肉眼难以察觉的细节世界", en: "Extreme close-up revealing a tiny world of detail invisible to the naked eye" },
      professionalTerms: ["macro view", "extreme close-up detail", "tiny world", "magnified"],
      promptFragment: { zh: "微距视角，超近距离展现细节的微小世界", en: "macro view revealing a tiny world of extreme close-up detail" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:close_up",
      version: "0.1.0",
      label: { zh: "特写/充满画面", en: "Close-up / fill frame" },
      plain: { zh: "近距离特写，主体充满画面，细节清晰", en: "Close-up shot where the subject fills the frame with clear detail" },
      professionalTerms: ["close-up", "fill frame", "intimate", "subject-dominant"],
      promptFragment: { zh: "特写镜头，主体充满画面，细节清晰突出", en: "close-up shot filling the frame with the subject for clear prominent detail" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:medium_shot",
      version: "0.1.0",
      label: { zh: "中景", en: "Medium shot" },
      plain: { zh: "半身或腰部以上构图，平衡主体和环境的关系", en: "Waist-up framing that balances subject presence with environmental context" },
      professionalTerms: ["medium shot", "waist-up", "balanced", "standard portrait"],
      promptFragment: { zh: "中景构图，半身或腰部以上，平衡主体与背景的关系", en: "medium shot composition, waist-up framing balancing subject and background" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:wide_shot",
      version: "0.1.0",
      label: { zh: "远景/全景", en: "Wide shot / full body" },
      plain: { zh: "全景构图，展现主体的完整身姿或场景全貌", en: "Wide shot showing the full body of the subject or the complete scene" },
      professionalTerms: ["wide shot", "full body", "establishing", "environmental"],
      promptFragment: { zh: "远景全景构图，展现完整身姿或场景全貌", en: "wide shot composition showing the full body or complete scene in context" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:extreme_wide",
      version: "0.1.0",
      label: { zh: "极远景", en: "Extreme wide shot" },
      plain: { zh: "超远距离拍摄，主体在画面中很小，强调宏大的空间尺度", en: "Extreme distance shot with a tiny subject emphasizing vast spatial scale" },
      professionalTerms: ["extreme wide shot", "tiny subject", "vast scene", "epic scale"],
      promptFragment: { zh: "极远景，主体在画面中显得渺小，强调宏大空间尺度", en: "extreme wide shot with a tiny subject emphasizing the vast epic scale of the scene" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:first_person",
      version: "0.1.0",
      label: { zh: "第一人称", en: "First-person POV" },
      plain: { zh: "模拟人眼所见的第一人称视角，沉浸感强", en: "First-person point of view simulating what a person sees, highly immersive" },
      professionalTerms: ["first-person POV", "subjective camera", "immersive", "from eyes"],
      promptFragment: { zh: "第一人称视角，从人眼角度看世界，沉浸感强烈", en: "first-person POV from eye level, highly immersive subjective perspective" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_perspective:over_the_shoulder",
      version: "0.1.0",
      label: { zh: "过肩视角", en: "Over-the-shoulder" },
      plain: { zh: "从主体身后越过肩膀看前方，常用于对话或互动场景", en: "View from behind the subject looking over their shoulder, common in conversation scenes" },
      professionalTerms: ["over-the-shoulder", "OTS", "behind subject", "third person"],
      promptFragment: { zh: "过肩视角，从主体身后看前方，有代入感", en: "over-the-shoulder view from behind the subject, creating a sense of presence" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
