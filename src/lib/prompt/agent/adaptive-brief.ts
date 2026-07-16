export type DifferentiationPillar =
  | "characterSignature"
  | "narrativeBehavior"
  | "visualWorld"
  | "presentationPurpose";

export interface AdaptiveKnownFact {
  dimension: string;
  value: string;
  source: "brief" | "history";
  specificity: "exact" | "broad";
  pillar: DifferentiationPillar;
  materiallyDifferentiating: boolean;
  knownOptionIds?: string[];
  candidatePolicy?: {
    allowedCandidateIds: string[];
    forbiddenCandidateIds: string[];
  };
}

export const PILLAR_BY_QUESTION_ID: Record<string, DifferentiationPillar> = {
  subject: "characterSignature",
  person_type: "characterSignature",
  gender_presentation: "characterSignature",
  age_band: "characterSignature",
  face_features: "characterSignature",
  hair: "characterSignature",
  makeup: "characterSignature",
  outfit: "characterSignature",
  body_type: "characterSignature",
  skin_tone: "characterSignature",
  character_archetype: "characterSignature",
  character_props: "characterSignature",
  portrait_expression: "narrativeBehavior",
  pose: "narrativeBehavior",
  character_interaction: "narrativeBehavior",
  scene: "visualWorld",
  lighting: "visualWorld",
  framing: "visualWorld",
  aspect_ratio: "visualWorld",
  camera: "visualWorld",
  camera_angle: "visualWorld",
  composition: "visualWorld",
  use_case: "presentationPurpose",
  character_render_style: "presentationPurpose",
  color_palette: "presentationPurpose",
  art_style: "presentationPurpose",
  mood: "presentationPurpose",
  detail_level: "presentationPurpose",
  post_processing: "presentationPurpose",
  constraints: "presentationPurpose",
  output_format: "presentationPurpose",
};

interface BriefRule {
  dimension: string;
  pattern: RegExp;
  specificity?: "exact" | "broad";
  material?: boolean | ((value: string, brief: string) => boolean);
  knownOptionIds?: string[] | ((value: string) => string[]);
  candidatePolicy?: AdaptiveKnownFact["candidatePolicy"];
}

const HAIR_STYLE_IDS = [
  "image_hair:long_straight",
  "image_hair:long_wavy",
  "image_hair:short_bob",
  "image_hair:pixie_cut",
  "image_hair:ponytail",
  "image_hair:braids",
  "image_hair:bun_updo",
  "image_hair:messy_tousled",
  "image_hair:curly_coily",
];

const RULES: BriefRule[] = [
  { dimension: "person_type", pattern: /乙游|视觉小说|手游|游戏角色|二次元角色|虚拟偶像|真人写真/, knownOptionIds: (value) => value.match(/乙游|视觉小说/) ? ["image_person_type:otome_visual_novel"] : value.includes("虚拟偶像") ? ["image_person_type:virtual_idol"] : value.match(/手游|游戏角色/) ? ["image_person_type:game_character"] : [] },
  { dimension: "gender_presentation", pattern: /女性|女生|女孩|女船长|女学生|女特工|男性|男生|男主|男模/, knownOptionIds: (value) => value.match(/男性|男生|男主|男模/) ? ["image_gender_presentation:masculine"] : ["image_gender_presentation:feminine"] },
  { dimension: "age_band", pattern: /\d{1,2}\s*岁|少年|少女|青年|中年|老年/, knownOptionIds: (value) => value.match(/少年|少女/) ? ["image_age_band:teen_character"] : [] },
  { dimension: "skin_tone", pattern: /古铜色(?:自然)?皮肤|自然皮肤质感|肤色|肤质/, knownOptionIds: (value) => value.includes("古铜") ? ["image_skin_tone:golden_tan", "image_skin_tone:natural_texture"] : value.includes("自然") ? ["image_skin_tone:natural_texture"] : [] },
  { dimension: "body_type", pattern: /高挑强健|高挑|强健|身形|体型/ },
  { dimension: "hair", pattern: /(?:银色|红色|紫色|黑色)?(?:长卷发|长直发|齐耳短发|短发|马尾|辫发|盘发)/, knownOptionIds: (value) => value.includes("长卷发") ? ["image_hair:long_wavy"] : value.match(/齐耳短发|短发/) ? ["image_hair:short_bob"] : value.includes("马尾") ? ["image_hair:ponytail"] : [] },
  { dimension: "hair", pattern: /银发|红发|紫发|黑发/, specificity: "broad", candidatePolicy: { allowedCandidateIds: HAIR_STYLE_IDS, forbiddenCandidateIds: [] } },
  { dimension: "face_features", pattern: /眼罩|疤痕|雀斑|异色瞳|五官|脸型/ },
  { dimension: "makeup", pattern: /无妆感|妆容|浓妆|淡妆/ },
  { dimension: "outfit", pattern: /穿[^，。；]+|外套|肩甲|盔甲|制服|西装|礼服|穿搭/ },
  { dimension: "character_props", pattern: /手持[^，。；]+|握[^，。；]+|长剑|弯刀|弓箭|弓手|道具/, knownOptionIds: (value) => value.match(/剑|弯刀/) ? ["image_character_props:sword"] : value.match(/弓/) ? ["image_character_props:bow"] : [] },
  { dimension: "character_archetype", pattern: /海盗船长|32岁[^，。；]*女船长/ },
  { dimension: "portrait_expression", pattern: /怒视|微笑|含笑|皱眉|疲惫(?:神情)?/ },
  { dimension: "pose", pattern: /双腿站稳|坐在|奔向|冲过|回眸|行走|正侧背三视图|站在|站着/, material: (value) => !/站在|站着/.test(value), knownOptionIds: (value) => /站在|站着/.test(value) ? ["image_pose:standing"] : value === "坐在" ? ["image_pose:sitting"] : [] },
  { dimension: "character_interaction", pattern: /牵(?:着|手)|拥抱|对视|看向窗外|第一人称互动/ },
  { dimension: "scene", pattern: /白色背景|白底|教室窗边|暴风雨甲板|雨夜霓虹巷|魔法森林|暴风雪/, material: (value) => !/白色背景|白底/.test(value), knownOptionIds: (value) => /白色背景|白底/.test(value) ? ["image_scene:white_bg"] : value.includes("暴风雪") ? ["image_scene:snow_scene"] : [] },
  { dimension: "camera_angle", pattern: /低机位|高机位|平视|俯视|仰视|第一人称视角|正侧背三视图/, knownOptionIds: (value) => value === "平视" ? ["image_camera_angle:eye_level"] : [] },
  { dimension: "camera", pattern: /\d{2,3}\s*mm(?:\s*浅景深)?|浅景深/, knownOptionIds: (value) => value.includes("85") ? ["image_camera:85mm_portrait", ...(value.includes("浅景深") ? ["image_camera:wide_aperture_bokeh"] : [])] : value.includes("35") ? ["image_camera:35mm_wide"] : value.includes("浅景深") ? ["image_camera:wide_aperture_bokeh"] : [] },
  { dimension: "framing", pattern: /全身|半身|近距离裁切|特写|远景/, knownOptionIds: (value) => /近距离裁切|特写/.test(value) ? ["image_framing:close_up"] : [] },
  { dimension: "composition", pattern: /海报构图|居中构图|留标题位置|三视图|正侧背/, knownOptionIds: (value) => value === "居中构图" ? ["image_composition:centered"] : [] },
  { dimension: "aspect_ratio", pattern: /(?:竖版|横版|方形)?\s*\d+\s*:\s*\d+|竖版|横版/, knownOptionIds: (value) => /2\s*:\s*3/.test(value) ? ["image_aspect_ratio:portrait_2_3"] : /1\s*:\s*1/.test(value) ? ["image_aspect_ratio:square_1_1"] : [] },
  { dimension: "lighting", pattern: /午后阳光|月光|电影光效|柔光|逆光|侧光/, knownOptionIds: (value) => value === "月光" ? ["image_lighting:moonlight"] : [] },
  { dimension: "use_case", pattern: /求职简历(?:的职业)?头像|品牌头像|小红书封面|手游卡面|手游主视觉|游戏主视觉|电影海报|黑色小说封面|小说封面|订婚邀请函|邀请函|官网合影|直播头像|动画主视觉|社交媒体头像|社交头像/, material: (value) => value !== "社交头像", knownOptionIds: (value) => value.match(/品牌头像|直播头像|社交媒体头像|社交头像/) ? ["image_use_case:avatar"] : value.match(/黑色小说封面|小说封面/) ? ["image_use_case:cover_image"] : value.match(/邀请函/) ? ["image_use_case:invitation"] : value.includes("电影海报") ? ["image_use_case:poster"] : [] },
  { dimension: "output_format", pattern: /透明\s*PNG/i },
  { dimension: "character_render_style", pattern: /手游卡面|手游主视觉|乙游\s*CG|角色设定表|动画主视觉|真人质感/, knownOptionIds: (value) => value === "角色设定表" ? ["image_character_render_style:character_sheet"] : value === "动画主视觉" ? ["image_character_render_style:anime_key_visual"] : value === "真人质感" ? ["image_character_render_style:realistic_portrait"] : value.match(/手游/) ? ["image_character_render_style:gacha_splash_art"] : [] },
  { dimension: "art_style", pattern: /二次元|动画(?!主视觉)|写实\s*3D|写实|插画|油画|水彩/, knownOptionIds: (value) => value.includes("3D") ? ["image_art_style:3d_render"] : value === "二次元" ? ["image_art_style:anime_manga"] : [] },
  { dimension: "color_palette", pattern: /蓝绿色(?:冷色)?调|冷灰蓝(?:低饱和)?|低饱和|暖色调|冷色调/, knownOptionIds: (value) => value.includes("蓝绿色") ? ["image_color_palette:cool", "image_color_palette:ocean_blue"] : value.includes("冷灰蓝") ? ["image_color_palette:cool", "image_color_palette:sophisticated_gray", ...(value.includes("低饱和") ? ["image_color_palette:muted"] : [])] : value.includes("低饱和") ? ["image_color_palette:muted"] : [] },
  { dimension: "mood", pattern: /史诗紧张氛围|紧张感|温柔心动|正式可信|正式但亲和|干练但?亲和|春日氛围|极简高级|强烈速度感|自然温暖|黑色小说/, knownOptionIds: (value) => value === "史诗紧张氛围" ? ["image_mood:epic_grand", "image_mood:dynamic_tense"] : [] },
  { dimension: "detail_level", pattern: /电影级高细节|高精细|高细节|精细/, knownOptionIds: (value) => value === "电影级高细节" ? ["image_detail_level:cinematic_quality", "image_detail_level:high_detail"] : value === "高精细" ? ["image_detail_level:high_detail", "image_detail_level:sharp_clean"] : value.includes("高细节") ? ["image_detail_level:high_detail"] : [] },
];

const UNKNOWN_MARKER = /没想好|不知道|不确定|未定|待定|请帮我决定|帮我决定|你来决定|随便|都可以|无所谓|不限|默认|看着办|可能|不一定/;
const UNKNOWN_DIMENSION_PATTERNS: Record<string, RegExp> = {
  scene: /背景|场景/,
  outfit: /服装|穿搭|穿什么|衣服/,
  portrait_expression: /表情/,
  lighting: /光线|光效|打光/,
  color_palette: /色调|配色/,
  mood: /氛围|情绪/,
  body_type: /体型|身形/,
};

export function unresolvedBriefDimensions(subjectBrief: string): string[] {
  if (!UNKNOWN_MARKER.test(subjectBrief)) return [];
  return Object.entries(UNKNOWN_DIMENSION_PATTERNS)
    .filter(([, pattern]) => pattern.test(subjectBrief))
    .map(([dimension]) => dimension);
}

function subjectMaterial(brief: string): boolean {
  return !/^(?:一个人|人物|职业头像|用于求职简历的职业头像)[，,]?/.test(brief.trim());
}

function subjectSpecificity(brief: string): "exact" | "broad" {
  return /^(?:职业头像|用于求职简历的职业头像)[，,]?/.test(brief.trim()) ? "broad" : "exact";
}

export function analyzeAdaptiveBrief(subjectBrief: string): AdaptiveKnownFact[] {
  const facts = new Map<string, AdaptiveKnownFact>();
  const uncertainDimensions = new Set(unresolvedBriefDimensions(subjectBrief));
  const material = subjectMaterial(subjectBrief);
  facts.set("subject", {
    dimension: "subject",
    value: subjectBrief,
    source: "brief",
    specificity: subjectSpecificity(subjectBrief),
    pillar: "characterSignature",
    materiallyDifferentiating: material,
  });

  for (const rule of RULES) {
    if (uncertainDimensions.has(rule.dimension)) continue;
    const match = subjectBrief.match(rule.pattern);
    if (!match) continue;
    const existing = facts.get(rule.dimension);
    const specificity = rule.specificity ?? "exact";
    if (existing?.specificity === "exact" && specificity === "broad") continue;
    const value = match[0].trim();
    const ruleMaterial = typeof rule.material === "function"
      ? rule.material(value, subjectBrief)
      : rule.material ?? true;
    facts.set(rule.dimension, {
      dimension: rule.dimension,
      value,
      source: "brief",
      specificity,
      pillar: PILLAR_BY_QUESTION_ID[rule.dimension],
      materiallyDifferentiating: ruleMaterial,
      ...(rule.knownOptionIds ? {
        knownOptionIds: typeof rule.knownOptionIds === "function"
          ? rule.knownOptionIds(value)
          : rule.knownOptionIds,
      } : {}),
      ...(rule.candidatePolicy ? { candidatePolicy: rule.candidatePolicy } : {}),
    });
  }

  if (facts.has("output_format") && !facts.has("scene")) {
    facts.set("scene", {
      dimension: "scene",
      value: "无环境背景",
      source: "brief",
      specificity: "exact",
      pillar: "visualWorld",
      materiallyDifferentiating: false,
      knownOptionIds: ["image_scene:transparent_bg"],
    });
  }

  return [...facts.values()];
}

export function materialHistoryValue(questionId: string, optionIds: string[], freeText?: string): boolean {
  const value = freeText?.trim() || optionIds.join(" ");
  if (!value) return false;
  if (UNKNOWN_MARKER.test(value)) return false;
  if (questionId === "scene" && /white_bg/.test(value)) return false;
  if (questionId === "pose" && /:standing$/.test(value)) return false;
  return true;
}
