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
}

const RULES: BriefRule[] = [
  { dimension: "person_type", pattern: /乙游|视觉小说|手游|游戏角色|二次元角色|虚拟偶像|真人写真/ },
  { dimension: "gender_presentation", pattern: /女性|女生|女孩|女船长|女骑士|女学生|女特工|男性|男生|男主|男模/ },
  { dimension: "age_band", pattern: /\d{1,2}\s*岁|少年|少女|青年|中年|老年/ },
  { dimension: "skin_tone", pattern: /古铜色(?:自然)?皮肤|自然皮肤质感|肤色|肤质/ },
  { dimension: "body_type", pattern: /高挑强健|高挑|强健|身形|体型/ },
  { dimension: "hair", pattern: /(?:银色|红色|紫色|黑色)?(?:长卷发|长直发|齐耳短发|短发|马尾|辫发|盘发)/ },
  { dimension: "hair", pattern: /银发|红发|紫发|黑发/, specificity: "broad" },
  { dimension: "face_features", pattern: /眼罩|疤痕|雀斑|异色瞳|五官|脸型/ },
  { dimension: "makeup", pattern: /无妆感|妆容|浓妆|淡妆/ },
  { dimension: "outfit", pattern: /穿[^，。；]+|外套|肩甲|盔甲|制服|西装|礼服|服装|穿搭/ },
  { dimension: "character_props", pattern: /手持[^，。；]+|握[^，。；]+|长剑|弯刀|弓箭|道具/ },
  { dimension: "character_archetype", pattern: /女船长|海盗船长/ },
  { dimension: "portrait_expression", pattern: /怒视|微笑|含笑|皱眉|疲惫神情|表情/ },
  { dimension: "pose", pattern: /双腿站稳|坐在|奔向|冲过|回眸|行走|正侧背三视图|站着/, material: (value) => value !== "站着" },
  { dimension: "character_interaction", pattern: /牵(?:着|手)|拥抱|对视|看向窗外|第一人称互动/ },
  { dimension: "scene", pattern: /白色背景|白底|教室窗边|暴风雨甲板|雨夜霓虹巷|魔法森林|暴风雪|背景|场景/, material: (value) => !/白色背景|白底/.test(value) },
  { dimension: "camera_angle", pattern: /低机位|高机位|平视|俯视|仰视|第一人称视角|正侧背三视图/ },
  { dimension: "camera", pattern: /\d{2,3}\s*mm(?:\s*浅景深)?|浅景深/ },
  { dimension: "framing", pattern: /全身|半身|近距离裁切|特写|远景/ },
  { dimension: "composition", pattern: /海报构图|居中构图|留标题位置|三视图|正侧背/ },
  { dimension: "aspect_ratio", pattern: /(?:竖版|横版|方形)?\s*\d+\s*:\s*\d+|竖版|横版/ },
  { dimension: "lighting", pattern: /午后阳光|月光|电影光效|柔光|逆光|侧光|光线|光效/ },
  { dimension: "use_case", pattern: /求职简历(?:的职业)?头像|品牌头像|小红书封面|手游卡面|手游主视觉|游戏主视觉|电影海报|小说封面|邀请函|官网合影|直播头像|角色设定表|动画主视觉|社交媒体头像|社交头像/, material: (value) => value !== "社交头像" },
  { dimension: "output_format", pattern: /透明\s*PNG/i },
  { dimension: "character_render_style", pattern: /手游卡面|手游主视觉|游戏主视觉|乙游\s*CG|小说封面|角色设定表|真人质感/ },
  { dimension: "art_style", pattern: /二次元|动画|写实\s*3D|写实|插画|油画|水彩/ },
  { dimension: "color_palette", pattern: /蓝绿色(?:冷色)?调|冷灰蓝|低饱和|暖色调|冷色调|色调/ },
  { dimension: "mood", pattern: /史诗紧张氛围|紧张感|温柔心动|正式可信|干练但?亲和|春日氛围|极简高级|强烈速度感|自然温暖|黑色小说|氛围/ },
  { dimension: "detail_level", pattern: /电影级高细节|高精细|高细节|精细/ },
];

function subjectMaterial(brief: string): boolean {
  return !/^(?:一个人|人物|职业头像|用于求职简历的职业头像)[，,]?/.test(brief.trim());
}

export function analyzeAdaptiveBrief(subjectBrief: string): AdaptiveKnownFact[] {
  const facts = new Map<string, AdaptiveKnownFact>();
  const material = subjectMaterial(subjectBrief);
  facts.set("subject", {
    dimension: "subject",
    value: subjectBrief,
    source: "brief",
    specificity: material ? "exact" : "broad",
    pillar: "characterSignature",
    materiallyDifferentiating: material,
  });

  for (const rule of RULES) {
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
    });
  }

  return [...facts.values()];
}

export function materialHistoryValue(questionId: string, optionIds: string[], freeText?: string): boolean {
  const value = freeText?.trim() || optionIds.join(" ");
  if (!value) return false;
  if (questionId === "scene" && /white_bg/.test(value)) return false;
  if (questionId === "pose" && /:standing$/.test(value)) return false;
  if (questionId === "use_case" && /:avatar$/.test(value)) return false;
  return true;
}
