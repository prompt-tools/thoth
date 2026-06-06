import { OPTION_CONFLICTS, OPTION_ASSOCIATIONS, ENTRY_ROUTES } from "./audit-model";

/** System prompt for the adaptive routing agent.
 *
 *  The agent never writes the final prompt — it only orchestrates which
 *  dimension to ask next and which narrowed subset of options to surface.
 *  The final image prompt is stitched deterministically from the option
 *  fragments the user picks. */
export const AGENT_SYSTEM_PROMPT = `你是一个图片提示词向导的"出题"智能体。面向不会写提示词的普通人。

你的唯一职责：为系统指定的**当前维度**挑选 3-6 个最契合用户已有选择的选项，并写一句 helperText。你不撰写最终提示词——最终提示词由系统用用户选中的选项确定性拼接。你不决定问哪个维度、不决定是否结束。

规则：
- 每次只调用一次 select_options 工具，为当前维度挑选 3-6 个最契合用户已有选择的选项，并写一句 helperText。
- 你【不决定】问哪个维度——维度由系统根据主类型和进度自动选择。
- 你【不决定】是否结束——结束由系统根据维度覆盖情况自动判断。
- **少即是好**：只露出最契合的选项，不要把整张列表倒出来。
- helperText 用一句简短中文，帮普通人理解这一步在选什么。
- 已经问过的维度不要重复再问。`;

/** Compact, data-driven组合知识 injected into the system prompt each turn.
 *  Built from the validated audit (audit-model.ts) — hard conflicts, soft
 *  cautions, and recommendation associations. Helps the agent narrow options
 *  without writing any prompt text itself. */
export function buildAgentGuidance(): string {
  const hard = OPTION_CONFLICTS.filter((c) => c.relation === "conflict");
  const soft = OPTION_CONFLICTS.filter((c) => c.relation === "caution");
  const lines: string[] = [
    "\n\n## 组合知识（来自语料+专业审计；仅用于收窄/排序选项，勿照抄进提示词）",
    "硬冲突——已选其一，就【不要】把另一个放进 visibleOptionIds：",
    ...hard.map((c) => `- ${c.a} ✗ ${c.b}（${c.reason}）`),
    "软警告——可共存但需谨慎，非用户明确意图时不要主动同时推荐：",
    ...soft.map((c) => `- ${c.a} ~ ${c.b}`),
    "推荐关联——用户已选 from 时，to 是高概率搭配，优先纳入候选：",
    ...OPTION_ASSOCIATIONS.map((a) => `- ${a.from} → ${a.to}`),
    "\n## 首轮路由（据用户的需求描述判断主类型，决定先问哪些维度）",
    "从描述里识别主类型，优先问该类型最相关的维度，跳过无关维度：",
    // Cap signals per type to keep the system prompt token-lean (some types
    // have 20+ signal words); the first ~10 are the most discriminative.
    ...ENTRY_ROUTES.map(
      (r) => `- 【${r.primaryType}】信号词：${r.signals.slice(0, 10).join("、")}`
    ),
    "路由要点：人像/动物先问 framing(景别)，再据景别决定细节深度；产品先问材质与镜头；场景/氛围以场景细节+天气+光线为主；'一个人在海边'按人像处理（人是主体）。",
    "\n## 景别控深（选了景别后据此决定后续问什么）",
    "- 特写/微距(close_up/macro_view)：追问皮肤质感、表情、发型/妆容等近距细节；少问全身姿态、整体着装、环境占比。",
    "- 中景/半身(medium_shot)：问上半身着装、姿态、手势、发型整体；不问皮肤毛孔级细节。",
    "- 全景/远景(wide_shot/extreme_wide)：问全身姿态、整体穿搭、主体在环境中的位置；跳过皮肤/妆容细节。",
  ];
  return lines.join("\n");
}
