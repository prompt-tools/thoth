import type { OptionSet } from "../../types";

export const imagePortraitExpressionOptions: OptionSet = {
  id: "image_portrait_expression",
  version: "0.1.0",
  label: { zh: "人物表情", en: "Portrait expression" },
  options: [
    {
      id: "image_portrait_expression:joyful",
      version: "0.1.0",
      label: { zh: "喜悦", en: "Joyful" },
      plain: { zh: "自发的喜悦，灿烂的笑容", en: "Spontaneous joy with a bright open smile" },
      promptFragment: {
        zh: "自发灿烂的笑容，眼神中流露真挚喜悦",
        en: "spontaneous bright smile, genuine joy in the eyes"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["joyful expression", "genuine smile", "candid happiness"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:confident",
      version: "0.1.0",
      label: { zh: "自信", en: "Confident" },
      plain: { zh: "直视镜头，从容自信的神态", en: "Direct eye contact, poised and assured" },
      promptFragment: {
        zh: "直视镜头，淡淡微笑，从容自信的神态",
        en: "direct eye contact, subtle assured smile, poised confidence"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["confident expression", "assertive look", "self-assured gaze"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:thoughtful",
      version: "0.1.0",
      label: { zh: "沉思", en: "Thoughtful" },
      plain: { zh: "若有所思，目光略移开", en: "Pensive, gaze slightly away" },
      promptFragment: {
        zh: "若有所思的表情，目光稍离镜头，陷入沉思",
        en: "pensive expression, gaze slightly averted, lost in thought"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["thoughtful expression", "pensive look", "contemplative gaze"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:melancholy",
      version: "0.1.0",
      label: { zh: "忧郁", en: "Melancholy" },
      plain: { zh: "内敛忧郁，目光低垂或望向远处", en: "Subdued melancholy, downcast or distant gaze" },
      promptFragment: {
        zh: "内敛忧郁的表情，目光低垂或望向远处，带有淡淡感伤",
        en: "subdued melancholy expression, downcast or distant gaze, faint wistfulness"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["melancholy expression", "wistful look", "sad eyes"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:surprised",
      version: "0.1.0",
      label: { zh: "惊喜", en: "Surprised" },
      plain: { zh: "睁大眼睛，眉毛扬起，真实惊讶", en: "Wide eyes, raised brows, genuine surprise" },
      promptFragment: {
        zh: "睁大的眼睛，扬起的眉毛，嘴微张，真实的惊讶神情",
        en: "wide eyes, raised eyebrows, mouth slightly open, genuine surprised expression"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["surprised expression", "shocked look", "wide-eyed expression"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:serene",
      version: "0.1.0",
      label: { zh: "平静", en: "Serene" },
      plain: { zh: "平静安然，柔和放松的神情", en: "Calm and peaceful, soft relaxed expression" },
      promptFragment: {
        zh: "平静安然的表情，放松柔和的目光，内心宁静",
        en: "serene calm expression, soft relaxed gaze, inner peace"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["serene expression", "peaceful look", "tranquil gaze"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:playful",
      version: "0.1.0",
      label: { zh: "俏皮", en: "Playful" },
      plain: { zh: "俏皮嬉戏，眼神带顽皮光芒", en: "Mischievous smile, playful glint in the eyes" },
      promptFragment: {
        zh: "俏皮的微笑，眼神中带着顽皮的光芒，轻松活泼",
        en: "playful mischievous smile, teasing glint in the eyes, light and lively"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["playful expression", "mischievous look", "cheeky smile"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:intense",
      version: "0.1.0",
      label: { zh: "专注", en: "Intense" },
      plain: { zh: "眼神锐利专注，坚定有力的表情", en: "Focused narrowed eyes, determined fierce expression" },
      promptFragment: {
        zh: "眼神收紧专注，坚定锐利的表情，充满力量感",
        en: "focused intense gaze, determined fierce expression, commanding presence"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["intense expression", "fierce look", "determined gaze", "powerful expression"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:tender",
      version: "0.1.0",
      label: { zh: "温柔", en: "Tender" },
      plain: { zh: "温暖柔和，慈爱亲切的神情", en: "Warm gentle eyes, soft nurturing expression" },
      promptFragment: {
        zh: "温暖柔和的眼神，轻柔慈爱的表情，散发亲切温度",
        en: "warm gentle eyes, soft nurturing expression, radiating kindness and warmth"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["tender expression", "gentle look", "warm gaze", "nurturing expression"],
      appliesTo: ["generic_image"]
    },
    {
      id: "image_portrait_expression:mysterious",
      version: "0.1.0",
      label: { zh: "神秘", en: "Mysterious" },
      plain: { zh: "淡淡神秘的微笑，目光略低，耐人寻味", en: "Enigmatic slight smile, gaze slightly lowered, air of secrecy" },
      promptFragment: {
        zh: "淡淡神秘的微笑，目光略低含蓄，带有耐人寻味的气质",
        en: "subtle enigmatic smile, gaze slightly lowered, mysterious and alluring presence"
      },
      riskHint: { zh: "", en: "" },
      professionalTerms: ["mysterious expression", "enigmatic look", "alluring gaze"],
      appliesTo: ["generic_image"]
    }
  ]
};
