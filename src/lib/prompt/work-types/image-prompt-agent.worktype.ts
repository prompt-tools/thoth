import type { QuestionSchema, WorkTypeConfig } from "../types";
import { imagePromptWorkType } from "./image-prompt.worktype";

/** Prototype-only worktype for the /agent-demo adaptive flow (Slice 2 / Phase A).
 *
 *  Derived from the canonical worktype so the two never silently drift, but with
 *  the conflated `perspective` dimension split into `framing` (景别/shot size) +
 *  `camera_angle` (机位/视角). The canonical worktype — and therefore the live
 *  main app at `/` — is intentionally left untouched. */

const framingQuestion: QuestionSchema = {
  id: "framing",
  version: "0.1.0",
  title: { zh: "景别（取景范围）", en: "Framing / shot size" },
  helper: {
    zh: "主体占画面多大？从特写到极远景。",
    en: "How much of the frame the subject fills, from close-up to extreme wide."
  },
  mode: "single",
  level: "advanced",
  required: false,
  optionSetId: "image_framing"
};

const cameraAngleQuestion: QuestionSchema = {
  id: "camera_angle",
  version: "0.1.0",
  title: { zh: "机位/视角", en: "Camera angle / viewpoint" },
  helper: {
    zh: "相机从哪个角度、哪种视点看主体。",
    en: "From which angle and viewpoint the camera observes the subject."
  },
  mode: "multi",
  level: "advanced",
  required: false,
  optionSetId: "image_camera_angle"
};

/** New prototype dimensions (Slice 2 / Phase B). Registered globally but only
 *  the prototype worktype references them, so the main app `/` is unaffected.
 *  pose/outfit/hair lean on free text (presets are quick starters). */
const phaseBQuestions: QuestionSchema[] = [
  {
    id: "camera",
    version: "0.1.0",
    title: { zh: "镜头/拍摄方式", en: "Camera / lens" },
    helper: { zh: "焦段、景深与画质质感（如 85mm 浅景深）。", en: "Focal length, depth of field, capture quality." },
    mode: "multi",
    level: "advanced",
    required: false,
    optionSetId: "image_camera"
  },
  {
    id: "pose",
    version: "0.1.0",
    title: { zh: "姿态/动作", en: "Pose" },
    helper: { zh: "人物的姿态或动作；找不到合适的可直接输入。", en: "The subject's pose or action; type your own if none fit." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_pose",
    scopeToOption: [
      "image_subject:single_person", "image_subject:group_portrait",
      "image_subject:character_design", "image_subject:silhouette_figure"
    ]
  },
  {
    id: "outfit",
    version: "0.1.0",
    title: { zh: "着装/造型", en: "Outfit" },
    helper: { zh: "服装风格；找不到合适的可直接输入。", en: "Clothing style; type your own if none fit." },
    mode: "multi",
    level: "advanced",
    required: false,
    optionSetId: "image_outfit",
    scopeToOption: [
      "image_subject:single_person", "image_subject:group_portrait",
      "image_subject:character_design"
    ]
  },
  {
    id: "hair",
    version: "0.1.0",
    title: { zh: "发型", en: "Hair" },
    helper: { zh: "发型长度与造型；找不到合适的可直接输入。", en: "Hair length and style; type your own if none fit." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_hair",
    scopeToOption: [
      "image_subject:single_person", "image_subject:group_portrait",
      "image_subject:character_design"
    ]
  },
  {
    id: "product_material",
    version: "0.1.0",
    title: { zh: "产品材质", en: "Product material" },
    helper: { zh: "产品的主要材质与表面质感。", en: "The product's primary material and surface finish." },
    mode: "multi",
    level: "advanced",
    required: false,
    optionSetId: "image_product_material"
  },
  {
    id: "weather",
    version: "0.1.0",
    title: { zh: "天气", en: "Weather" },
    helper: { zh: "场景的天气氛围。", en: "The weather atmosphere of the scene." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_weather"
  },
  // P4: animal attribute dims — scoped to pet_animal / wildlife via gradient
  {
    id: "animal_breed",
    version: "0.1.0",
    title: { zh: "品种", en: "Breed" },
    helper: { zh: "宠物或动物的具体品种。", en: "The specific breed of the pet or animal." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_animal_breed",
    scopeToOption: ["image_subject:pet_animal", "image_subject:wildlife"]
  },
  {
    id: "animal_coat",
    version: "0.1.0",
    title: { zh: "毛色/花纹", en: "Coat color / pattern" },
    helper: { zh: "动物的被毛颜色与花纹类型。", en: "The coat color and pattern of the animal." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_animal_coat",
    scopeToOption: ["image_subject:pet_animal", "image_subject:wildlife"]
  },
  {
    id: "animal_pose",
    version: "0.1.0",
    title: { zh: "姿态/动作", en: "Pose / action" },
    helper: { zh: "动物的姿势或动作状态。", en: "The posture or action state of the animal." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_animal_pose",
    scopeToOption: ["image_subject:pet_animal", "image_subject:wildlife"]
  },
  {
    id: "animal_expression",
    version: "0.1.0",
    title: { zh: "表情/神态", en: "Expression / gaze" },
    helper: { zh: "动物面部的神情和视线方向（近景时有效）。", en: "Facial expression and gaze direction (effective in close-up framing)." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_animal_expression",
    scopeToOption: ["image_subject:pet_animal"]
  },
  // P5: architecture attribute dims — scoped to architectural_exterior / interior_space
  {
    id: "arch_style",
    version: "0.1.0",
    title: { zh: "建筑风格", en: "Architectural style" },
    helper: { zh: "建筑的历史或当代风格流派。", en: "The historical or contemporary style of the architecture." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_arch_style",
    scopeToOption: ["image_subject:architectural_exterior", "image_subject:interior_space"]
  },
  {
    id: "arch_type",
    version: "0.1.0",
    title: { zh: "建筑类型", en: "Building type" },
    helper: { zh: "建筑的功能类型或用途。", en: "The functional type or purpose of the building." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_arch_type",
    scopeToOption: ["image_subject:architectural_exterior", "image_subject:interior_space"]
  },
  {
    id: "arch_material",
    version: "0.1.0",
    title: { zh: "建筑材质", en: "Building material" },
    helper: { zh: "建筑主要外立面或结构材料。", en: "The primary facade or structural material of the building." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_arch_material",
    scopeToOption: ["image_subject:architectural_exterior", "image_subject:interior_space"]
  },
  {
    id: "arch_viewpoint",
    version: "0.1.0",
    title: { zh: "建筑视角", en: "Architectural viewpoint" },
    helper: { zh: "拍摄或呈现建筑的角度与构图方式。", en: "The angle and compositional approach for capturing or presenting the building." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_arch_viewpoint",
    scopeToOption: ["image_subject:architectural_exterior", "image_subject:interior_space"]
  },
  // P6: portrait expression — scoped to single_person / character_design
  {
    id: "portrait_expression",
    version: "0.1.0",
    title: { zh: "人物表情", en: "Portrait expression" },
    helper: { zh: "人物面部的神情与气质（近景/半身时最有效）。", en: "Facial expression and presence of the person (most effective in close-up or medium framing)." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_portrait_expression",
    scopeToOption: ["image_subject:single_person", "image_subject:character_design"]
  },
  // P7: food-scoped dims — scoped to food_beverage / plated_dish / dessert_beverage
  {
    id: "food_state",
    version: "0.1.0",
    title: { zh: "食物状态", en: "Food state" },
    helper: { zh: "食物表面视觉属性与热度信号：酥脆、光泽、融化、蒸汽、多汁等。", en: "Food surface visual properties and freshness/heat signals: crispy, glossy, melting, steaming, juicy, etc." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_food_state",
    scopeToOption: [
      "image_subject:food_beverage",
      "image_subject:plated_dish",
      "image_subject:dessert_beverage",
    ],
  },
  {
    id: "food_tableware_styling",
    version: "0.1.0",
    title: { zh: "食器/摆盘", en: "Tableware / plating surface" },
    helper: { zh: "盘子、木板、玻璃杯和台面道具：白瓷、原木板、岩板、大理石、手工陶碗等。", en: "Plates, boards, glassware and surface props: white ceramic, wood board, slate, marble, artisan bowl, etc." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_food_tableware",
    scopeToOption: [
      "image_subject:food_beverage",
      "image_subject:plated_dish",
      "image_subject:dessert_beverage",
    ],
  },
];

export const imagePromptAgentWorkType: WorkTypeConfig = {
  ...imagePromptWorkType,
  version: `${imagePromptWorkType.version}-agent`,
  questions: [
    ...imagePromptWorkType.questions.flatMap((q) =>
      q.id === "perspective" ? [framingQuestion, cameraAngleQuestion] : [q]
    ),
    ...phaseBQuestions
  ]
};
