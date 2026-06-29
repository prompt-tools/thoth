/** Reorder autofill candidates when the user's seed mentions styling cues. */
export const PROP_SEED_SIGNALS = [
  "剑", "刀", "枪", "法杖", "杖", "盾", "书", "卷", "麦克风", "mic", "weapon", "sword", "staff", "shield", "手持",
];

const FILL_BOOST_RULES: { questionId: string; signals: string[] }[] = [
  {
    questionId: "hair",
    signals: ["银发", "黑发", "金发", "白发", "发型", "马尾", "刘海", "辫", "hair", "ponytail", "bangs", "braid"],
  },
  {
    questionId: "pose",
    signals: ["站", "坐", "走", "蹲", "回眸", "姿态", "pose", "standing", "sitting", "walking", "looking back"],
  },
  {
    questionId: "character_render_style",
    signals: [
      "立绘", "乙游", "卡面", "gacha", "splash", "live2d", "vtuber", "手游", "视觉小说",
      "机甲", "精灵", "奇幻", "mecha", "elf", "fantasy", "3d", "写实",
    ],
  },
  {
    questionId: "art_style",
    signals: ["胶片", "韩漫", "赛博", "二次元", "anime", "水彩", "写实", "3d", "漫画", "manga", "cyberpunk", "黑白", "时尚"],
  },
  {
    questionId: "lighting",
    signals: ["自然光", "柔光", "逆光", "黄金", "霓虹", "lighting", "golden hour", "影棚", "studio light"],
  },
  {
    questionId: "outfit",
    signals: ["婚纱", "制服", "盔甲", "cosplay", "西装", "汉服", "和服", "机甲", "armor", "uniform", "dress"],
  },
  {
    questionId: "character_interaction",
    signals: ["pov", "牵手", "拥抱", "对视", "第一人称", "心动", "摸头", "holding hands"],
  },
  {
    questionId: "character_props",
    signals: PROP_SEED_SIGNALS,
  },
  {
    questionId: "scene",
    signals: [
      "海边", "职场", "漫展", "校园", "城堡", "影棚", "场照", "室内", "街道",
      "studio", "street", "beach", "office", "convention",
    ],
  },
];

/** Corpus B-tier blocks — autofill must cover these even when LLM fails (§7). */
export const PORTRAIT_CORE_FILL = ["lighting", "hair", "pose"] as const;

/** Portrait simple/standard always fills 5 secondary dims (P0-1). */
export const PORTRAIT_FILL_CAP = 5;

export function portraitFillCap(type: string): number {
  return type === "人像" ? PORTRAIT_FILL_CAP : 4;
}

const AGE_BAND_SIGNALS = [
  "青年", "少年", "成熟", "老年", "儿童", "teen", "adult", "mature", "elderly", "young", "middle-aged",
];

export const CAMERA_SEED_SIGNALS = [
  "85mm", "35mm", "50mm", "24mm", "bokeh", "镜头", "虚化", "lens", "f/1", "f/2", "景深", "焦外", "mm lens",
];

function hasSignal(text: string, signals: string[]): boolean {
  const lower = text.toLowerCase();
  return signals.some((s) => lower.includes(s.toLowerCase()));
}

function outfitSignals(): string[] {
  return FILL_BOOST_RULES.find((r) => r.questionId === "outfit")!.signals;
}

function poseSignals(): string[] {
  return FILL_BOOST_RULES.find((r) => r.questionId === "pose")!.signals;
}

export function hasCameraSeed(description: string | undefined): boolean {
  if (!description?.trim()) return false;
  return hasSignal(description, CAMERA_SEED_SIGNALS);
}

export function hasPropSeed(description: string | undefined): boolean {
  if (!description?.trim()) return false;
  return hasSignal(description, PROP_SEED_SIGNALS);
}

export function fillBoostSignals(questionId: string): readonly string[] {
  return FILL_BOOST_RULES.find((r) => r.questionId === questionId)?.signals ?? [];
}

export function boostedQuestionIds(description: string | undefined): Set<string> {
  const boosted = new Set<string>();
  if (!description?.trim()) return boosted;
  for (const rule of FILL_BOOST_RULES) {
    if (hasSignal(description, rule.signals)) boosted.add(rule.questionId);
  }
  return boosted;
}

/** Stable sort: boosted dims first (gradient order preserved within each group). */
export function boostFillCandidates(candidates: string[], description: string | undefined): string[] {
  const boosted = boostedQuestionIds(description);
  if (boosted.size === 0) return candidates;
  const front: string[] = [];
  const rest: string[] = [];
  for (const qid of candidates) {
    if (boosted.has(qid)) front.push(qid);
    else rest.push(qid);
  }
  return [...front, ...rest];
}

/**
 * Portrait-only autofill ordering: seed boost → corpus B-tier core → outfit/pose XOR → age_band demotion.
 */
export function applyPortraitFillPolicy(
  candidates: string[],
  description: string | undefined,
): string[] {
  if (candidates.length === 0) return candidates;

  const core = PORTRAIT_CORE_FILL.filter((id) => candidates.includes(id));
  const rest = candidates.filter((id) => !(PORTRAIT_CORE_FILL as readonly string[]).includes(id));
  let list = [...core, ...rest];

  list = boostFillCandidates(list, description);

  const desc = description ?? "";
  if (list.includes("outfit") && list.includes("pose")) {
    const outfitHit = hasSignal(desc, outfitSignals());
    const poseHit = hasSignal(desc, poseSignals());
    if (outfitHit && !poseHit) list = list.filter((q) => q !== "pose");
    else if (poseHit && !outfitHit) list = list.filter((q) => q !== "outfit");
    else list = list.filter((q) => q !== "outfit");
  }

  if (list.includes("age_band") && !hasSignal(desc, AGE_BAND_SIGNALS)) {
    list = [...list.filter((q) => q !== "age_band"), "age_band"];
  }

  return list;
}
