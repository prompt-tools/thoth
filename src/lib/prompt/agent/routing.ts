/**
 * The product is portrait-only. Descriptions may mention animals, food, or
 * buildings as scene props, but the primary subject route is always 人像.
 */
export function routePrimaryType(description: string): string {
  void description;
  return "人像";
}

// ── Description-aware subject suggestions ────────────────────────────────

const WOMAN_SIGNALS = ["女生", "女孩", "美女", "女性", "女人", "女主", "1girl", "girl", "woman", "female"];
const MAN_SIGNALS = ["男生", "帅哥", "男性", "男人", "男主", "1boy", "boy", "man", "male"];
const COUPLE_SIGNALS = ["情侣", "双人", "cp", "couple", "duo", "恋人"];
const GROUP_SIGNALS = ["多人", "群像", "团队", "group", "ensemble"];
const GAME_SIGNALS = [
  "游戏", "手游", "卡面", "立绘", "gacha", "game character", "splash art",
  "剑士", "战士", "骑士", "法师", "弓箭手", "机甲", "rpg", "原神", "genshin",
  "swordsman", "warrior", "knight", "mage", "archer", "mecha", "boss", "npc",
];
const CHARACTER_DESIGN_SIGNALS = [
  "设定图", "人设", "角色设计", "三视图", "turnaround", "character sheet", "design sheet", "设定",
];
const NOVEL_SIGNALS = ["小说", "封面", "主角", "book cover", "novel"];
const OTOME_SIGNALS = [
  "乙游", "视觉小说", "恋爱游戏", "otome", "visual novel", "dating sim", "pov", "第一人称",
];
const ANIME_SIGNALS = ["二次元", "动漫", "漫画", "anime", "manga"];
const VIRTUAL_SIGNALS = ["虚拟", "vtuber", "vup", "oc", "虚拟偶像", "原创角色"];
const COSPLAY_SIGNALS = ["cosplay", "coser", "角色扮演"];

function hasAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal.toLowerCase()));
}

/**
 * Derive suggested subject option ids from the user's free-text description and
 * the already-routed primary type. Used to show "推荐" badges on the subject
 * question before any selections exist (so suggestedIdsFor() would return ∅).
 *
 * Returns an empty Set when no strong signal is found — never forces a suggestion.
 */
export function suggestedIdsFromDescription(description: string, type: string): Set<string> {
  if (type !== "人像") return new Set();
  const lower = description.toLowerCase();
  if (hasAny(lower, OTOME_SIGNALS)) return new Set(["image_subject:otome_character"]);
  if (hasAny(lower, CHARACTER_DESIGN_SIGNALS)) return new Set(["image_subject:character_design"]);
  if (hasAny(lower, GAME_SIGNALS)) return new Set(["image_subject:game_character"]);
  if (hasAny(lower, NOVEL_SIGNALS)) return new Set(["image_subject:novel_character"]);
  if (hasAny(lower, VIRTUAL_SIGNALS)) return new Set(["image_subject:virtual_idol"]);
  if (hasAny(lower, COSPLAY_SIGNALS)) return new Set(["image_subject:cosplay_character"]);
  if (hasAny(lower, ANIME_SIGNALS)) return new Set(["image_subject:anime_character"]);
  if (hasAny(lower, COUPLE_SIGNALS)) return new Set(["image_subject:couple_portrait"]);
  if (hasAny(lower, GROUP_SIGNALS)) return new Set(["image_subject:group_portrait"]);
  if (hasAny(lower, WOMAN_SIGNALS)) return new Set(["image_subject:beautiful_woman"]);
  if (hasAny(lower, MAN_SIGNALS)) return new Set(["image_subject:handsome_man"]);
  return new Set();
}
