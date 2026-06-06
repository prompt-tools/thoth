import type { OptionSet } from "../../types";

export const imageCompositionOptions: OptionSet = {
  id: "image_composition",
  version: "0.1.0",
  label: { zh: "构图/布局", en: "Composition / Layout" },
  categories: [
    {
      id: "cat:image_composition:classic",
      label: { zh: "经典构图", en: "Classic" },
      optionIds: [
        "image_composition:centered",
        "image_composition:rule_of_thirds",
        "image_composition:golden_ratio",
        "image_composition:symmetrical",
        "image_composition:negative_space",
        "image_composition:triangular"
      ]
    },
    {
      id: "cat:image_composition:dynamic",
      label: { zh: "动态构图", en: "Dynamic" },
      optionIds: [
        "image_composition:diagonal",
        "image_composition:leading_lines",
        "image_composition:frame_within_frame",
        "image_composition:s_curve",
        "image_composition:flat_lay",
        "image_composition:fill_frame",
        "image_composition:dutch_angle",
        "image_composition:radial",
        "image_composition:repeating_pattern"
      ]
    }
  ],
  options: [
    {
      id: "image_composition:centered",
      version: "0.1.0",
      label: { zh: "居中构图", en: "Centered composition" },
      plain: { zh: "主体放在画面正中央，平衡稳重", en: "Subject placed at the center of the frame, balanced and stable" },
      professionalTerms: ["centered", "symmetrical", "balanced", "formal", "stable"],
      promptFragment: {
        zh: "居中构图，主体位于画面正中央，视觉平衡稳重",
        en: "centered composition with the subject at the exact center for visual balance and stability"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:rule_of_thirds",
      version: "0.1.0",
      label: { zh: "三分法", en: "Rule of thirds" },
      plain: { zh: "主体放在画面三分之一处，比居中更灵动", en: "Subject at one-third of the frame, more dynamic than centered" },
      professionalTerms: ["rule of thirds", "off-center", "dynamic", "balanced asymmetry"],
      promptFragment: {
        zh: "三分法构图，主体偏离中心放置在三分之一处，画面自然灵动",
        en: "rule of thirds composition with the subject placed off-center for a natural, dynamic feel"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:golden_ratio",
      version: "0.1.0",
      label: { zh: "黄金分割", en: "Golden ratio" },
      plain: { zh: "按照1:1.618的经典比例安排画面元素", en: "Elements arranged according to the classic 1:1.618 proportion" },
      professionalTerms: ["golden ratio", "Fibonacci spiral", "natural balance", "harmonious"],
      promptFragment: {
        zh: "黄金分割构图，画面元素按经典比例排布，视觉和谐优雅",
        en: "golden ratio composition with elements arranged in classical proportions for visual harmony"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:diagonal",
      version: "0.1.0",
      label: { zh: "对角线构图", en: "Diagonal composition" },
      plain: { zh: "主体或线条沿对角线方向排列，有动态感", en: "Subject or lines arranged along a diagonal for dynamic energy" },
      professionalTerms: ["diagonal", "dynamic", "movement", "energy", "tension"],
      promptFragment: {
        zh: "对角线构图，画面沿斜线方向展开，带来动感和视觉张力",
        en: "diagonal composition with elements arranged along a slanted line for dynamic energy and visual tension"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:symmetrical",
      version: "0.1.0",
      label: { zh: "对称构图", en: "Symmetrical composition" },
      plain: { zh: "左右或上下完全对称，极致的秩序美感", en: "Perfect left-right or top-bottom symmetry with absolute order" },
      professionalTerms: ["symmetrical", "mirror", "perfect balance", "formal", "architectural"],
      promptFragment: {
        zh: "对称构图，画面左右或上下完全对称，呈现极致的秩序美感",
        en: "symmetrical composition with perfect left-right or top-bottom mirroring for ultimate aesthetic order"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:leading_lines",
      version: "0.1.0",
      label: { zh: "引导线构图", en: "Leading lines" },
      plain: { zh: "利用画面中的线条引导视线到主体", en: "Use converging lines within the frame to guide the eye to the subject" },
      professionalTerms: ["leading lines", "converging lines", "depth", "perspective", "eye path"],
      promptFragment: {
        zh: "引导线构图，画面中的线条将视线自然引导至主体，增强空间深度",
        en: "leading lines composition where converging lines naturally guide the viewer's eye to the subject, enhancing depth"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:frame_within_frame",
      version: "0.1.0",
      label: { zh: "框架构图", en: "Frame within a frame" },
      plain: { zh: "利用前景元素形成天然画框包裹主体", en: "Use foreground elements to create a natural frame around the subject" },
      professionalTerms: ["frame within frame", "foreground framing", "depth", "layers"],
      promptFragment: {
        zh: "框架式构图，利用前景元素形成天然画框，将视线集中在主体上",
        en: "frame-within-a-frame composition using foreground elements as a natural border to focus attention on the subject"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:negative_space",
      version: "0.1.0",
      label: { zh: "负空间/留白", en: "Negative space" },
      plain: { zh: "大量空白包围主体，极简有呼吸感", en: "Large empty space around the subject for a minimal, breathable feel" },
      professionalTerms: ["negative space", "minimal", "breathing room", "isolation", "clean"],
      promptFragment: {
        zh: "留白构图，大面积负空间包围主体，画面简洁有呼吸感",
        en: "negative space composition with generous empty areas around the subject for a clean, breathable aesthetic"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:triangular",
      version: "0.1.0",
      label: { zh: "三角构图", en: "Triangular composition" },
      plain: { zh: "画面元素形成三角形排列，稳定有层次", en: "Elements forming a triangular arrangement for stability and hierarchy" },
      professionalTerms: ["triangle", "pyramid", "stability", "hierarchy", "strong base"],
      promptFragment: {
        zh: "三角构图，画面元素以三角形排列，结构稳定且层次分明",
        en: "triangular composition with elements arranged in a pyramid shape for structural stability and clear hierarchy"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:s_curve",
      version: "0.1.0",
      label: { zh: "S形曲线", en: "S-curve" },
      plain: { zh: "蜿蜒的S形曲线引导视线流动", en: "A winding S-curve guiding the eye through the frame" },
      professionalTerms: ["s-curve", "serpentine", "graceful flow", "winding", "elegant"],
      promptFragment: {
        zh: "S形曲线构图，蜿蜒的线条引导视线在画面中优雅流动",
        en: "S-curve composition with winding lines guiding the viewer's eye gracefully through the frame"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:flat_lay",
      version: "0.1.0",
      label: { zh: "俯拍/平铺", en: "Flat lay / top-down" },
      plain: { zh: "从正上方垂直俯拍，元素平铺排列", en: "Direct overhead shot with elements laid flat in organized arrangement" },
      professionalTerms: ["flat lay", "top-down", "knolling", "overhead", "organized"],
      promptFragment: {
        zh: "俯拍平铺构图，从正上方垂直拍摄，元素整齐排列",
        en: "flat lay composition shot directly from above, with elements neatly arranged in an organized layout"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:fill_frame",
      version: "0.1.0",
      label: { zh: "特写充满", en: "Fill the frame" },
      plain: { zh: "主体充满整个画面，近距离沉浸感", en: "Subject fills the entire frame for immersive close-up impact" },
      professionalTerms: ["fill frame", "tight crop", "immersive", "close", "subject-dominant"],
      promptFragment: {
        zh: "充满画面构图，主体占据几乎全部画幅，带来强烈的沉浸感",
        en: "fill-the-frame composition with the subject dominating nearly the entire image for strong immersion"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:dutch_angle",
      version: "0.1.0",
      label: { zh: "荷兰角/倾斜", en: "Dutch angle" },
      plain: { zh: "画面故意倾斜，营造不安或动感", en: "Deliberately tilted frame for unease or dynamic energy" },
      professionalTerms: ["Dutch angle", "tilted", "canted", "unease", "dynamic", "dramatic"],
      promptFragment: {
        zh: "荷兰角倾斜构图，画面故意倾斜，带来不安感或强烈的戏剧动态",
        en: "Dutch angle composition with a deliberately tilted frame for unease or dramatic dynamic energy"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:radial",
      version: "0.1.0",
      label: { zh: "放射状构图", en: "Radial composition" },
      plain: { zh: "元素从中心向外放射，视觉冲击力强", en: "Elements radiating outward from the center for strong visual impact" },
      professionalTerms: ["radial", "sunburst", "energy outward", "converging", "explosive"],
      promptFragment: {
        zh: "放射状构图，元素从画面中心向外扩散，带来强烈的视觉冲击力",
        en: "radial composition with elements bursting outward from the center for powerful visual impact"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_composition:repeating_pattern",
      version: "0.1.0",
      label: { zh: "重复/图案", en: "Repeating pattern" },
      plain: { zh: "同一元素重复排列形成节奏和纹理", en: "The same element repeated to create rhythm and texture" },
      professionalTerms: ["pattern", "repetition", "rhythm", "texture", "tessellation"],
      promptFragment: {
        zh: "重复图案构图，相同或相似的元素规律排列，形成视觉节奏和纹理感",
        en: "repeating pattern composition with identical or similar elements arranged rhythmically for visual texture"
      },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
