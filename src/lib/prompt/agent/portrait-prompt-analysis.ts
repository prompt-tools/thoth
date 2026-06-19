export type PortraitPromptSection =
  | "subject"
  | "identity"
  | "face"
  | "hair"
  | "outfit"
  | "pose"
  | "interaction"
  | "scene"
  | "camera"
  | "lighting"
  | "style"
  | "quality"
  | "negative";

export interface PortraitPromptAnalysis {
  totalRows: number;
  portraitRows: number;
  portraitPrompts: string[];
  sectionCounts: Record<PortraitPromptSection, number>;
  topTokens: Array<{ token: string; count: number }>;
}

const PORTRAIT_SIGNALS = [
  "person",
  "portrait",
  "girl",
  "woman",
  "man",
  "boy",
  "character",
  "face",
  "eyes",
  "hair",
  "人",
  "人物",
  "人像",
  "女生",
  "女孩",
  "美女",
  "男生",
  "帅哥",
  "角色",
  "乙游",
  "二次元",
  "立绘",
  "头像",
];

const SECTION_PATTERNS: Record<PortraitPromptSection, RegExp[]> = {
  subject: [/portrait|person|character|girl|woman|man|boy|人物|人像|角色|女生|男生|美女|帅哥/i],
  identity: [/adult|young|mature|teen|warrior|mage|prince|idol|年龄|青年|成熟|少年|战士|法师|偶像|王子/i],
  face: [/face|eyes|gaze|smile|expression|jawline|cheekbone|脸|眼|眼神|表情|微笑|五官|下颌|颧骨/i],
  hair: [/hair|bangs|ponytail|braid|silver hair|black hair|发|刘海|马尾|辫|银发|黑发/i],
  outfit: [/outfit|dress|suit|uniform|armor|robe|服装|穿搭|裙|西装|制服|盔甲|长袍/i],
  pose: [/pose|standing|sitting|walking|looking back|姿态|动作|站|坐|行走|回眸/i],
  interaction: [/holding hands|embrace|reaching|looking at viewer|pov|kiss|hug|牵手|拥抱|伸手|互动|第一视角|看向观众|摸头/i],
  scene: [/scene|background|studio|street|castle|room|背景|场景|影棚|街道|城堡|房间/i],
  camera: [/close-up|medium shot|wide shot|lens|85mm|bokeh|景别|特写|半身|全身|镜头|虚化/i],
  lighting: [/lighting|soft light|golden hour|backlight|光|柔光|逆光|黄金时刻|霓虹/i],
  style: [/anime|manga|realistic|photorealistic|otome|cg|illustration|二次元|写实|乙游|插画|卡面/i],
  quality: [/masterpiece|best quality|high detail|8k|detailed|高清|高质量|精细|细节/i],
  negative: [/negative|no |bad anatomy|extra fingers|nsfw|负面|不要|避免|畸形|多手指|低质量/i],
};

const TOKEN_SPLIT = /[\s,，、;；|/()[\]{}:：]+/;
const STOP_TOKENS = new Set(["a", "an", "the", "and", "with", "of", "in", "on", "for", "to", "是", "的", "和"]);

export function isPortraitPrompt(text: string): boolean {
  const normalized = text.toLowerCase();
  return PORTRAIT_SIGNALS.some((signal) => normalized.includes(signal.toLowerCase()));
}

export function detectPortraitSections(text: string): Set<PortraitPromptSection> {
  const sections = new Set<PortraitPromptSection>();
  for (const [section, patterns] of Object.entries(SECTION_PATTERNS) as Array<[PortraitPromptSection, RegExp[]]>) {
    if (patterns.some((pattern) => pattern.test(text))) sections.add(section);
  }
  return sections;
}

export function tokenizePrompt(text: string): string[] {
  return text
    .split(TOKEN_SPLIT)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 2 && !STOP_TOKENS.has(token));
}

export function analyzePortraitPrompts(prompts: Iterable<string>, topN = 20): PortraitPromptAnalysis {
  let totalRows = 0;
  const portraitPrompts: string[] = [];
  const sectionCounts = Object.keys(SECTION_PATTERNS).reduce((acc, key) => {
    acc[key as PortraitPromptSection] = 0;
    return acc;
  }, {} as Record<PortraitPromptSection, number>);
  const tokenCounts = new Map<string, number>();

  for (const prompt of prompts) {
    totalRows += 1;
    const text = prompt.trim();
    if (!text || !isPortraitPrompt(text)) continue;

    portraitPrompts.push(text);
    for (const section of detectPortraitSections(text)) {
      sectionCounts[section] += 1;
    }
    for (const token of tokenizePrompt(text)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  const topTokens = [...tokenCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([token, count]) => ({ token, count }));

  return {
    totalRows,
    portraitRows: portraitPrompts.length,
    portraitPrompts,
    sectionCounts,
    topTokens,
  };
}
