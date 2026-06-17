import type { OptionSet } from "../../types";

export const imageCharacterInteractionOptions: OptionSet = {
  id: "image_character_interaction",
  version: "0.1.0",
  label: { zh: "动作/互动", en: "Action / interaction" },
  options: [
    {
      id: "image_character_interaction:looking_at_viewer",
      version: "0.1.0",
      label: { zh: "看向观众", en: "Looking at viewer" },
      plain: { zh: "角色直视镜头，代入感强", en: "Character looks directly at the camera for immersion" },
      professionalTerms: ["looking at viewer", "direct eye contact", "immersive gaze"],
      promptFragment: { zh: "直视镜头，与观众产生明确眼神交流，代入感强", en: "looking directly at the viewer with clear eye contact and strong immersion" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_interaction:reaching_hand",
      version: "0.1.0",
      label: { zh: "伸手靠近", en: "Reaching hand" },
      plain: { zh: "向观众伸手或靠近，适合乙游 CG", en: "Reaching toward viewer, suited for otome CG" },
      professionalTerms: ["reaching hand", "hand toward viewer", "incoming gesture"],
      promptFragment: { zh: "向镜头伸手或靠近，像在邀请观众进入画面，互动感强", en: "reaching a hand toward the camera as if inviting the viewer into the scene, with strong interaction" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_interaction:holding_hands_pov",
      version: "0.1.0",
      label: { zh: "牵手 POV", en: "Holding hands POV" },
      plain: { zh: "第一视角牵手或手部互动", en: "First-person holding-hands or hand interaction" },
      professionalTerms: ["holding hands", "POV hands", "female POV", "first-person CG"],
      promptFragment: { zh: "第一视角牵手互动，画面中出现手部关系，适合乙游沉浸式 CG", en: "first-person holding-hands interaction with visible hand relationship, suited for immersive otome CG" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_interaction:gentle_head_pat",
      version: "0.1.0",
      label: { zh: "摸头/安抚", en: "Head pat / comfort" },
      plain: { zh: "温柔摸头、安抚或保护动作", en: "Gentle head pat, comforting, or protective gesture" },
      professionalTerms: ["head pat", "comforting gesture", "protective gesture"],
      promptFragment: { zh: "温柔安抚动作，如轻轻摸头或保护性靠近，氛围治愈亲密", en: "gentle comforting gesture such as a soft head pat or protective closeness, healing and intimate atmosphere" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_interaction:embrace",
      version: "0.1.0",
      label: { zh: "拥抱", en: "Embrace" },
      plain: { zh: "拥抱、靠近或亲密但不过界的互动", en: "Hugging, closeness, or intimate but non-explicit interaction" },
      professionalTerms: ["embrace", "hug", "intimate non-explicit interaction"],
      promptFragment: { zh: "拥抱或靠近互动，关系亲密但非露骨，情绪温暖", en: "embracing or close interaction, intimate but non-explicit, with warm emotion" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "必须避免未成年人或露骨性暗示组合。", en: "Must not be combined with minors or explicit sexual implication." }
    },
    {
      id: "image_character_interaction:battle_ready",
      version: "0.1.0",
      label: { zh: "战斗准备", en: "Battle ready" },
      plain: { zh: "持武器、摆出战斗或防御姿态", en: "Holding weapon, combat, or defensive stance" },
      professionalTerms: ["battle ready", "combat pose", "weapon stance", "defensive pose"],
      promptFragment: { zh: "战斗准备动作，持武器或摆出防御姿态，身体张力明确", en: "battle-ready action, holding a weapon or defensive stance with clear body tension" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_interaction:holding_prop",
      version: "0.1.0",
      label: { zh: "手持道具", en: "Holding prop" },
      plain: { zh: "手持书、花、武器、法杖等角色道具", en: "Holding a book, flower, weapon, staff, or character prop" },
      professionalTerms: ["holding prop", "character prop", "symbolic item"],
      promptFragment: { zh: "手持一个强化身份的道具，如书、花、武器或法杖，让角色设定更清晰", en: "holding one identity-defining prop such as a book, flower, weapon, or staff to clarify character design" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    },
    {
      id: "image_character_interaction:walking_scene",
      version: "0.1.0",
      label: { zh: "行走入景", en: "Walking into scene" },
      plain: { zh: "角色在场景中行走，带故事推进感", en: "Character walking within the scene, suggesting story progression" },
      professionalTerms: ["walking into scene", "mid-stride", "narrative motion"],
      promptFragment: { zh: "角色在场景中行走，衣摆或头发微动，有故事推进感", en: "character walking through the scene with subtle motion in clothing or hair, suggesting narrative progression" },
      appliesTo: ["generic_image"],
      riskHint: { zh: "", en: "" }
    }
  ]
};
