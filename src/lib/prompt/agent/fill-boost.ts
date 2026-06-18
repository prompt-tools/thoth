/** Reorder autofill candidates when the user's seed mentions styling cues. */
const FILL_BOOST_RULES: { questionId: string; signals: string[] }[] = [
  {
    questionId: "hair",
    signals: ["银发", "黑发", "金发", "白发", "发型", "马尾", "刘海", "辫", "hair", "ponytail", "bangs", "braid"],
  },
  {
    questionId: "character_render_style",
    signals: ["立绘", "乙游", "卡面", "gacha", "splash", "live2d", "vtuber", "手游", "视觉小说"],
  },
  {
    questionId: "art_style",
    signals: ["胶片", "韩漫", "赛博", "二次元", "anime", "水彩", "写实", "3d", "漫画", "manga", "cyberpunk"],
  },
  {
    questionId: "lighting",
    signals: ["自然光", "柔光", "逆光", "黄金", "霓虹", "lighting", "golden hour", "影棚", "studio light"],
  },
  {
    questionId: "outfit",
    signals: ["婚纱", "制服", "盔甲", "cosplay", "西装", "汉服", "和服", "机甲", "armor", "uniform"],
  },
  {
    questionId: "character_interaction",
    signals: ["pov", "牵手", "拥抱", "对视", "第一人称", "心动", "摸头", "holding hands"],
  },
  {
    questionId: "character_props",
    signals: ["剑", "法杖", "麦克风", "盾", "sword", "staff", "shield", "weapon"],
  },
];

function hasSignal(text: string, signals: string[]): boolean {
  const lower = text.toLowerCase();
  return signals.some((s) => lower.includes(s.toLowerCase()));
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
