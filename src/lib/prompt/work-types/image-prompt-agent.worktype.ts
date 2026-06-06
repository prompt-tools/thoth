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
    optionSetId: "image_pose"
  },
  {
    id: "outfit",
    version: "0.1.0",
    title: { zh: "着装/造型", en: "Outfit" },
    helper: { zh: "服装风格；找不到合适的可直接输入。", en: "Clothing style; type your own if none fit." },
    mode: "multi",
    level: "advanced",
    required: false,
    optionSetId: "image_outfit"
  },
  {
    id: "hair",
    version: "0.1.0",
    title: { zh: "发型", en: "Hair" },
    helper: { zh: "发型长度与造型；找不到合适的可直接输入。", en: "Hair length and style; type your own if none fit." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_hair"
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
  }
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
