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

const PORTRAIT_SUBJECT_SCOPE = [
  "image_subject:single_person",
  "image_subject:beautiful_woman",
  "image_subject:handsome_man",
  "image_subject:couple_portrait",
  "image_subject:group_portrait",
  "image_subject:game_character",
  "image_subject:novel_character",
  "image_subject:otome_character",
  "image_subject:anime_character",
  "image_subject:virtual_idol",
  "image_subject:cosplay_character",
  "image_subject:character_design",
  "image_subject:silhouette_figure"
];

const FICTIONAL_CHARACTER_SCOPE = [
  "image_subject:game_character",
  "image_subject:novel_character",
  "image_subject:otome_character",
  "image_subject:anime_character",
  "image_subject:virtual_idol",
  "image_subject:cosplay_character",
  "image_subject:character_design"
];

/** Portrait-only dimensions. They are registered globally but only this adaptive
 * worktype references them; most are scoped so the renderer folds them into the
 * leading subject phrase instead of leaking standalone non-human dimensions. */
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
    id: "person_type",
    version: "0.1.0",
    title: { zh: "人物方向", en: "Portrait direction" },
    helper: { zh: "真人写真、漂亮男女、游戏角色、小说人物、乙游或二次元等。", en: "Realistic portrait, attractive male/female, game, novel, otome, or anime character." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_person_type",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "gender_presentation",
    version: "0.1.0",
    title: { zh: "性别呈现", en: "Gender presentation" },
    helper: { zh: "人物整体更偏女性化、男性化、中性，或不强调性别。", en: "Feminine, masculine, androgynous, or unspecified presentation." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_gender_presentation",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "age_band",
    version: "0.1.0",
    title: { zh: "年龄段", en: "Age band" },
    helper: { zh: "选择人物年龄气质；少年少女只允许健康非性感化表达。", en: "Choose age presence; teen characters must remain healthy and non-sexualized." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_age_band",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "skin_tone",
    version: "0.1.0",
    title: { zh: "肤色/肤质", en: "Skin tone / texture" },
    helper: { zh: "肤色、肤质与真实皮肤细节，避免塑料感磨皮。", en: "Skin tone, texture, and realistic skin detail." },
    mode: "multi",
    level: "advanced",
    required: false,
    optionSetId: "image_skin_tone",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "face_features",
    version: "0.1.0",
    title: { zh: "脸型/五官", en: "Face / features" },
    helper: { zh: "脸型、眼神、五官和角色辨识点。", en: "Face shape, gaze, features, and identity markers." },
    mode: "multi",
    level: "advanced",
    required: false,
    optionSetId: "image_face_features",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "body_type",
    version: "0.1.0",
    title: { zh: "体型/身形", en: "Body type" },
    helper: { zh: "全身或半身图中人物的身形比例与体态。", en: "Body shape and posture for half-body or full-body portraits." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_body_type",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "character_archetype",
    version: "0.1.0",
    title: { zh: "角色原型", en: "Character archetype" },
    helper: { zh: "乙游、小说、游戏和虚拟角色的性格/身份原型。", en: "Personality or role archetype for otome, novel, game, and virtual characters." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_character_archetype",
    scopeToOption: FICTIONAL_CHARACTER_SCOPE
  },
  {
    id: "character_render_style",
    version: "0.1.0",
    title: { zh: "角色呈现风格", en: "Character render style" },
    helper: { zh: "真人、半写实、乙游 CG、手游卡面、小说封面或头像立绘。", en: "Realistic, semi-realistic, otome CG, gacha art, novel cover, or avatar rendering." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_character_render_style",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "character_interaction",
    version: "0.1.0",
    title: { zh: "动作/互动", en: "Action / interaction" },
    helper: { zh: "对视、牵手 POV、拥抱、战斗动作或手持道具等。", en: "Eye contact, holding-hands POV, embrace, battle action, or holding props." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_character_interaction",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
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
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
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
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
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
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "makeup",
    version: "0.1.0",
    title: { zh: "妆容", en: "Makeup" },
    helper: { zh: "特写/半身人像的妆面风格；找不到合适的可直接输入。", en: "Makeup style for close-up or medium portraits; type your own if none fit." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_makeup",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
  },
  {
    id: "character_props",
    version: "0.1.0",
    title: { zh: "手持道具", en: "Character props" },
    helper: { zh: "剑、法杖、书卷、麦克风等角色道具。", en: "Swords, staffs, books, microphones, and other character props." },
    mode: "single",
    level: "advanced",
    required: false,
    optionSetId: "image_character_props",
    scopeToOption: FICTIONAL_CHARACTER_SCOPE
  },
  {
    id: "portrait_expression",
    version: "0.1.0",
    title: { zh: "人物表情", en: "Portrait expression" },
    helper: { zh: "人物面部的神情与气质（近景/半身时最有效）。", en: "Facial expression and presence of the person (most effective in close-up or medium framing)." },
    mode: "single",
    level: "core",
    required: false,
    optionSetId: "image_portrait_expression",
    scopeToOption: PORTRAIT_SUBJECT_SCOPE
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
