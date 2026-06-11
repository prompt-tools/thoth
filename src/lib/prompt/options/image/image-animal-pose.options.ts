import type { OptionSet } from "../../types";

/**
 * P4: Animal pose / action vocabulary.
 * Based on Danbooru posture tag groups, filtered for T2I controllability.
 * Scoped to image_subject:pet_animal and image_subject:wildlife via gradient.
 */
export const imageAnimalPoseOptions: OptionSet = {
  id: "image_animal_pose",
  version: "0.1.0",
  label: { zh: "姿态/动作", en: "Pose / action" },
  options: [
    {
      id: "image_animal_pose:sitting",
      version: "0.1.0",
      label: { zh: "端坐", en: "Sitting" },
      plain: { zh: "端正坐姿，面朝前方", en: "Upright sitting posture facing forward" },
      professionalTerms: ["sitting pose", "seated animal"],
      promptFragment: {
        zh: "端正坐姿，四肢收拢，背部挺直，直视镜头",
        en: "upright sitting pose with paws tucked in, back straight and gaze directed at camera",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:lying_down",
      version: "0.1.0",
      label: { zh: "趴卧", en: "Lying down" },
      plain: { zh: "趴在地上或平面上", en: "Lying flat on a surface" },
      professionalTerms: ["prone pose", "lying down", "resting pose"],
      promptFragment: {
        zh: "趴卧姿态，腹部贴地，前爪伸展或收拢，放松休憩",
        en: "lying-down pose with belly to the ground, front paws stretched or tucked, relaxed and resting",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:standing",
      version: "0.1.0",
      label: { zh: "站立", en: "Standing" },
      plain: { zh: "四脚站立，身体自然", en: "Standing on all four legs naturally" },
      professionalTerms: ["standing pose", "four-point stance"],
      promptFragment: {
        zh: "四肢站立，身体自然舒展，侧面或四分之三视角展示体型轮廓",
        en: "standing on all four legs in a natural pose, shown in side or three-quarter view to display the body silhouette",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:running_leaping",
      version: "0.1.0",
      label: { zh: "奔跑/跳跃", en: "Running / leaping" },
      plain: { zh: "快速奔跑或腾空跳跃", en: "Running at speed or leaping in the air" },
      professionalTerms: ["running pose", "leaping", "mid-jump"],
      promptFragment: {
        zh: "奔跑或跳跃的动态瞬间，四肢腾空伸展，毛发和耳朵随风飞扬，充满力量感",
        en: "dynamic running or leaping moment with all legs extended in the air, fur and ears swept back, full of energy",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:playing",
      version: "0.1.0",
      label: { zh: "嬉戏", en: "Playing" },
      plain: { zh: "玩耍嬉闹，追逐玩具", en: "Playing and chasing a toy" },
      professionalTerms: ["play pose", "playful action"],
      promptFragment: {
        zh: "嬉戏玩耍姿态，前爪扑向玩具或同伴，尾巴高扬，充满活力和好奇心",
        en: "playful posture with front paws batting at a toy or companion, tail raised high, full of energy and curiosity",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:grooming",
      version: "0.1.0",
      label: { zh: "梳理毛发", en: "Grooming" },
      plain: { zh: "自我梳理，舔毛", en: "Self-grooming, licking fur" },
      professionalTerms: ["grooming pose", "self-grooming"],
      promptFragment: {
        zh: "自我梳理姿态，抬起一只前爪或弯颈舔毛，专注而放松的表情",
        en: "self-grooming pose with one paw raised or neck bent to lick fur, focused and relaxed expression",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:sleeping_curled",
      version: "0.1.0",
      label: { zh: "蜷缩睡觉", en: "Sleeping curled up" },
      plain: { zh: "蜷成一团熟睡", en: "Curled up in a ball sleeping" },
      professionalTerms: ["sleeping curl pose", "curled up sleeping"],
      promptFragment: {
        zh: "蜷缩成球状熟睡，尾巴环绕身体，眼睛闭合，表情安详放松",
        en: "curled up in a tight ball asleep, tail wrapped around the body, eyes closed and expression peaceful",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_pose:alert_upright",
      version: "0.1.0",
      label: { zh: "警觉直立", en: "Alert and upright" },
      plain: { zh: "警觉竖耳直视，全神贯注", en: "Alert with ears pricked, fully attentive" },
      professionalTerms: ["alert stance", "attentive pose"],
      promptFragment: {
        zh: "警觉站立，耳朵竖起，身体微微前倾，眼神专注犀利，随时准备行动",
        en: "alert upright stance with ears pricked, body leaning slightly forward and sharp focused gaze ready to react",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
  ],
};
