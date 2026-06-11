import type { OptionSet } from "../../types";

/**
 * P4: Animal expression vocabulary (face/gaze close-up dims).
 * Gated by framing: activates for close-up / portrait framing.
 * Scoped to image_subject:pet_animal via gradient.
 */
export const imageAnimalExpressionOptions: OptionSet = {
  id: "image_animal_expression",
  version: "0.1.0",
  label: { zh: "表情/神态", en: "Expression / gaze" },
  options: [
    {
      id: "image_animal_expression:curious_tilted",
      version: "0.1.0",
      label: { zh: "好奇侧头", en: "Curious tilt" },
      plain: { zh: "头歪向一边，好奇望着镜头", en: "Head tilted to one side, curiously looking at camera" },
      professionalTerms: ["head tilt", "curious expression"],
      promptFragment: {
        zh: "头部向一侧轻微倾斜，大眼睛好奇地注视镜头，耳朵微微前倾，呆萌而专注的神情",
        en: "head gently tilted to one side, wide curious eyes looking straight into the camera, ears slightly forward — endearing and attentive",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_expression:relaxed_content",
      version: "0.1.0",
      label: { zh: "放松满足", en: "Relaxed and content" },
      plain: { zh: "眯眼放松，神情舒适满足", en: "Half-closed eyes, relaxed and satisfied look" },
      professionalTerms: ["relaxed expression", "contented look"],
      promptFragment: {
        zh: "眼睛微微眯起，嘴角放松，全身散发慵懒满足的气息，耳朵自然下垂或侧展",
        en: "eyes slightly squinted, mouth relaxed, radiating a lazy contentment throughout, ears naturally drooped or fanned out",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_expression:playful_excited",
      version: "0.1.0",
      label: { zh: "兴奋活泼", en: "Playful and excited" },
      plain: { zh: "眼睛睁大，嘴开着，充满活力", en: "Wide eyes and open mouth, full of energy" },
      professionalTerms: ["playful expression", "excited face"],
      promptFragment: {
        zh: "眼睛睁大发亮，嘴巴微张或吐舌，耳朵竖起，整个面部洋溢着兴奋和活力",
        en: "eyes wide and bright, mouth slightly open or tongue out, ears perked up, the whole face radiating excitement and vitality",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_expression:gentle_soft",
      version: "0.1.0",
      label: { zh: "温柔眼神", en: "Gentle and soft" },
      plain: { zh: "眼神温柔，面部表情柔和", en: "Soft gentle gaze and calm facial expression" },
      professionalTerms: ["soft gaze", "gentle expression"],
      promptFragment: {
        zh: "眼神温柔深邃，面部肌肉放松，散发出安心、信赖的亲切感",
        en: "soft and deep gaze with relaxed facial muscles, conveying a sense of calm trust and warmth",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_expression:alert_focused",
      version: "0.1.0",
      label: { zh: "专注警觉", en: "Alert and focused" },
      plain: { zh: "目光锐利，专注于某处", en: "Sharp gaze intensely focused on something" },
      professionalTerms: ["alert expression", "focused gaze"],
      promptFragment: {
        zh: "目光锐利专注，盯向某个方向，耳朵竖起捕捉声响，眉头微皱，全神贯注",
        en: "sharp focused gaze locked on a direction, ears pricked to catch sounds, slight brow furrow of complete concentration",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_expression:sleepy_squinting",
      version: "0.1.0",
      label: { zh: "慵懒半眯眼", en: "Sleepy squinting" },
      plain: { zh: "眼睛半闭，昏昏欲睡", en: "Half-closed eyes, drowsy and sleepy" },
      professionalTerms: ["sleepy expression", "squinting eyes", "drowsy look"],
      promptFragment: {
        zh: "眼睛懒洋洋地半闭着，有气无力的慵懒模样，仿佛随时会再次入睡",
        en: "eyes lazily half-closed in a drowsy squint, languid and sleepy look as if about to doze off again",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
  ],
};
