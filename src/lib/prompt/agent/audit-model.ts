/** A directional relation between two option ids in different dimensions. */
export interface OptionConflict {
  a: string;
  b: string;
  /** "conflict" = hard (hide), "caution" = soft (warn but allow). */
  relation: "conflict" | "caution";
  reason: string;
  confidence?: number;
}

/** A soft recommendation: when `from` is selected, `to` is a likely companion. */
export interface OptionAssociation {
  from: string;
  to: string;
  /** 0-1 prior strength. Mostly semantic (model intuition), not measured. */
  strength: number;
  reason: string;
}

/** Free-text -> primary-type routing signals. Kept for guidance/tests; runtime route is portrait-only. */
export interface EntryRoute {
  primaryType: string;
  signals: string[];
  note?: string;
}

export const OPTION_CONFLICTS: OptionConflict[] = [
  {
    a: "image_framing:wide_shot",
    b: "image_camera:85mm_portrait",
    relation: "conflict",
    reason: "85mm 人像镜头视角窄，容纳不下全身远景",
    confidence: 0.85,
  },
  {
    a: "image_framing:extreme_wide",
    b: "image_camera:85mm_portrait",
    relation: "conflict",
    reason: "85mm 长焦无法表现极远景人物关系",
    confidence: 0.9,
  },
  {
    a: "image_framing:close_up",
    b: "image_camera:35mm_wide",
    relation: "caution",
    reason: "35mm 广角近距拍人脸会透视变形",
    confidence: 0.6,
  },
  {
    a: "image_body_type:curvy",
    b: "image_age_band:teen_character",
    relation: "conflict",
    reason: "少年/少女角色必须保持健康非性感化，不能强调曲线",
    confidence: 0.95,
  },
  {
    a: "image_character_interaction:embrace",
    b: "image_age_band:teen_character",
    relation: "caution",
    reason: "少年/少女角色的亲密互动需避免暧昧和性感化",
    confidence: 0.8,
  },
  {
    a: "image_art_style:minimalist",
    b: "image_detail_level:hyper_detailed",
    relation: "conflict",
    reason: "极简风格追求少，极致细节追求多，方向矛盾",
    confidence: 0.9,
  },
  {
    a: "image_color_palette:monochrome",
    b: "image_color_palette:vibrant",
    relation: "conflict",
    reason: "黑白/灰度与鲜艳饱和互斥",
    confidence: 0.95,
  },
  {
    a: "image_subject:silhouette_figure",
    b: "image_face_features:bright_clear_eyes",
    relation: "caution",
    reason: "剪影人物不展示眼睛细节",
    confidence: 0.7,
  },
];

export const OPTION_ASSOCIATIONS: OptionAssociation[] = [
  {
    from: "image_use_case:avatar",
    to: "image_subject:single_person",
    strength: 0.95,
    reason: "头像通常是单人或角色脸部",
  },
  {
    from: "image_subject:beautiful_woman",
    to: "image_gender_presentation:feminine",
    strength: 0.9,
    reason: "漂亮女生主体通常匹配女性化呈现",
  },
  {
    from: "image_subject:handsome_man",
    to: "image_gender_presentation:masculine",
    strength: 0.9,
    reason: "帅气男性主体通常匹配男性化呈现",
  },
  {
    from: "image_subject:otome_character",
    to: "image_person_type:otome_visual_novel",
    strength: 0.95,
    reason: "乙游主体匹配乙游/视觉小说方向",
  },
  {
    from: "image_subject:game_character",
    to: "image_character_render_style:gacha_splash_art",
    strength: 0.8,
    reason: "游戏角色常以卡面、立绘或宣传图呈现",
  },
  {
    from: "image_subject:novel_character",
    to: "image_character_render_style:novel_cover",
    strength: 0.8,
    reason: "小说人物常用于封面或故事角色图",
  },
  {
    from: "image_subject:anime_character",
    to: "image_character_render_style:anime_key_visual",
    strength: 0.85,
    reason: "二次元角色通常匹配动画主视觉语言",
  },
  {
    from: "image_subject:virtual_idol",
    to: "image_character_render_style:vtuber_avatar",
    strength: 0.85,
    reason: "虚拟偶像/OC 常用于头像、半身和立绘",
  },
  {
    from: "image_person_type:realistic_beauty",
    to: "image_skin_tone:natural_texture",
    strength: 0.75,
    reason: "真实人像需要自然皮肤质感，避免塑料磨皮",
  },
  {
    from: "image_person_type:otome_visual_novel",
    to: "image_character_interaction:looking_at_viewer",
    strength: 0.7,
    reason: "乙游/视觉小说常用直视镜头增强代入",
  },
  {
    from: "image_character_render_style:otome_cg",
    to: "image_character_interaction:holding_hands_pov",
    strength: 0.7,
    reason: "乙游 CG 常见第一视角牵手互动",
  },
  {
    from: "image_subject:single_person",
    to: "image_scene:studio_env",
    strength: 0.6,
    reason: "单人人像常用影棚环境",
  },
  {
    from: "image_subject:single_person",
    to: "image_lighting:window_soft",
    strength: 0.6,
    reason: "人像常用窗边柔光",
  },
  {
    from: "image_mood:romantic_dreamy",
    to: "image_lighting:golden_hour",
    strength: 0.7,
    reason: "浪漫氛围常用黄金时刻",
  },
];

export const ENTRY_ROUTES: EntryRoute[] = [
  {
    primaryType: "人像",
    signals: [
      "人",
      "人物",
      "人像",
      "角色",
      "女生",
      "美女",
      "男生",
      "帅哥",
      "情侣",
      "乙游",
      "游戏角色",
      "小说人物",
      "二次元",
      "虚拟偶像",
      "cosplay",
      "portrait",
      "character",
      "girl",
      "woman",
      "boy",
      "man",
      "otome",
      "anime",
      "vtuber",
    ],
    note: "运行时固定为人像；这些信号只用于系统提示与推荐理解。",
  },
];

/** Option ids that conflict with any of the given selected ids.
 * By default only "hard" conflicts (relation==="conflict") block.
 * Pass {includeCaution:true} to also block "caution" relations. */
export function conflictIdsFor(
  selectedIds: Iterable<string>,
  opts?: { includeCaution?: boolean },
): Set<string> {
  const selected = new Set(selectedIds);
  const blocked = new Set<string>();
  for (const c of OPTION_CONFLICTS) {
    if (c.relation === "conflict" || (opts?.includeCaution && c.relation === "caution")) {
      if (selected.has(c.a)) blocked.add(c.b);
      if (selected.has(c.b)) blocked.add(c.a);
    }
  }
  return blocked;
}

/** Option ids that hard-conflict with any of the given selected ids. */
export function hardConflictIdsFor(selectedIds: Iterable<string>): Set<string> {
  return conflictIdsFor(selectedIds, { includeCaution: false });
}

/** Option ids recommended (associated) given the currently selected ids —
 * directional: from `from` (selected) to `to`. Used for "推荐" badges. */
export function suggestedIdsFor(selectedIds: Iterable<string>): Set<string> {
  const selected = new Set(selectedIds);
  const out = new Set<string>();
  for (const a of OPTION_ASSOCIATIONS) {
    if (selected.has(a.from) && !selected.has(a.to)) out.add(a.to);
  }
  return out;
}
