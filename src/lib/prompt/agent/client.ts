import type { CatalogManifest } from "./catalog-manifest";
import { getTypeFilteredSubjectOptionIds } from "./catalog-manifest";
import {
  type AgentDecision,
  type AgentHistoryItem,
} from "./decision";
import { AGENT_SYSTEM_PROMPT, buildAgentGuidance } from "./system-prompt";
import type { ProviderPreset } from "./providers";
import { logAgent } from "./debug-log";
import { routePrimaryType } from "./routing";
import { activeDimensions } from "./active-dimensions";
import type { Precision } from "./gradient";
import { GRADIENT } from "./gradient";
import { conflictIdsFor, suggestedIdsFor } from "./audit-model";
import { heuristicFillGaps, missingPortraitCoreFill } from "./fill";
import type { AdaptiveTurnResult } from "./adaptive-turn";

const ANTHROPIC_VERSION = "2023-06-01";
const PROXY_URL = "/api/llm";

const POLISH_TOOL = {
  name: "refined_prompt",
  description:
    "Return the lightly polished prompts. Only improve wording/flow; never add, drop, or change the meaning of any element the user chose.",
  parameters: {
    type: "object",
    properties: {
      zh: { type: "string", description: "润色后的中文提示词" },
      en: { type: "string", description: "Polished English prompt" },
    },
    required: ["zh", "en"],
    additionalProperties: false,
  },
} as const;

export interface ProxyRequest {
  endpoint: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Forward a provider-shaped request through our server-side proxy (avoids
 *  browser CORS for OpenAI-compatible providers). */
async function callProxy(req: ProxyRequest): Promise<unknown> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Provider returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// ── diagnostics type ──────────────────────────────────────────────────────

export interface TurnDiagnostics {
  rawNextQuestionId: string | undefined;
  rawDone: boolean;
  droppedInvalidOptionIds: string[];
  /** legacy, removed in C-9b logic (dimension is now runtime-determined) */
  attemptedTierJump: boolean;
  /** legacy, removed in C-9b logic */
  outOfPool: boolean;
  attempts: number;
  /** legacy, removed in C-9b logic */
  corrected: boolean;
  fallbackUsed: boolean;
  source: "model" | "fallback" | "remainingEmpty" | "ordered";
  /** @deprecated use ctx.precision instead */
  tier: "overall" | "detail";
  /** Token usage from the provider response, when present. Powers cost
   *  calculation + per-turn generation observations in Langfuse. Absent on
   *  no-call paths (remainingEmpty early-exit, network-error fallback). */
  usage?: { promptTokens?: number; completionTokens?: number };
}

/** Pull token usage from a provider response in a format-agnostic way:
 *  OpenAI-compatible uses usage.prompt_tokens/completion_tokens; Anthropic
 *  uses usage.input_tokens/output_tokens. Returns undefined when absent. */
export function extractUsage(
  resp: unknown
): { promptTokens?: number; completionTokens?: number } | undefined {
  const usage = (resp as { usage?: unknown })?.usage;
  if (!usage || typeof usage !== "object") return undefined;
  const u = usage as {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  const promptTokens = u.prompt_tokens ?? u.input_tokens;
  const completionTokens = u.completion_tokens ?? u.output_tokens;
  if (promptTokens == null && completionTokens == null) return undefined;
  return { promptTokens, completionTokens };
}

/** Build the per-turn user message. Exported for unit testing. */
export function describeHistory(
  history: AgentHistoryItem[],
  manifest: CatalogManifest,
  userDescription?: string
): string {
  const intent = userDescription?.trim()
    ? `用户的需求描述：「${userDescription.trim()}」\n（据此判断主类型并选择相关维度。）\n\n`
    : "";
  if (history.length === 0) {
    return `${intent}用户尚未做出任何选择。请为当前维度挑选最契合的选项。`;
  }
  const lines = history.map((item) => {
    const dim = manifest.find((d) => d.questionId === item.questionId);
    const title = dim?.title ?? item.questionId;
    if (item.freeText?.trim()) {
      return `- ${title}：${item.freeText.trim()}（用户自定义输入）`;
    }
    const picks = item.selectedOptionIds
      .map((id) => dim?.options.find((o) => o.id === id)?.label ?? id)
      .join("、");
    return `- ${title}：${picks || "（未选）"}`;
  });
  return `${intent}用户已做出的选择：\n${lines.join("\n")}\n\n请为当前维度挑选 3-6 个最契合用户意图的选项，并写一句 helperText。`;
}

// ── request builders (per wire format) ────────────────────────────────────

function buildToolRequest(
  provider: ProviderPreset,
  apiKey: string,
  args: {
    model: string;
    maxTokens: number;
    systemText: string;
    userText: string;
    tool: { name: string; description: string; parameters: object };
  }
): ProxyRequest {
  const { model, maxTokens, systemText, userText, tool } = args;

  if (provider.format === "anthropic") {
    return {
      endpoint: `${provider.baseURL}/v1/messages`,
      headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
      body: {
        model,
        max_tokens: maxTokens,
        system: systemText,
        tools: [
          { name: tool.name, description: tool.description, input_schema: tool.parameters },
        ],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content: userText }],
      },
    };
  }

  // OpenAI-compatible (DeepSeek, MiMo, …)
  return {
    endpoint: `${provider.baseURL}/chat/completions`,
    headers: { authorization: `Bearer ${apiKey}` },
    body: {
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userText },
      ],
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
      // Provider-specific extras, e.g. MiMo's chat_template_kwargs to disable
      // thinking. Spread last so the preset can override defaults if needed.
      ...(provider.extraBody ?? {}),
    },
  };
}

/** Pull the forced tool-call's input object out of either wire format. */
function extractToolInput(
  provider: ProviderPreset,
  resp: unknown,
  toolName: string
): unknown {
  if (provider.format === "anthropic") {
    const content = (resp as { content?: Array<{ type: string; name?: string; input?: unknown }> })
      .content;
    return content?.find((b) => b.type === "tool_use" && b.name === toolName)?.input;
  }
  const calls = (
    resp as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
    }
  ).choices?.[0]?.message?.tool_calls;
  const call = calls?.find((c) => c.function?.name === toolName) ?? calls?.[0];
  const rawArgs = call?.function?.arguments;
  if (typeof rawArgs !== "string") return rawArgs;
  try {
    return JSON.parse(rawArgs);
  } catch {
    return undefined;
  }
}

// ── shared pure functions (no side-effects, no logging) ──────────────────

/** Build the proxy request + context for one agent turn.
 *  Pure: no logging, no network calls. */
export function buildTurnRequest(
  provider: ProviderPreset,
  apiKey: string,
  args: { manifest: CatalogManifest; history: AgentHistoryItem[]; userDescription?: string; precision?: Precision }
): { proxyReq: ProxyRequest; ctx: TurnContext } {
  const { manifest, history, userDescription, precision = "simple" } = args;

  // C-9b: use gradient routing + activeDimensions instead of OVERALL gate
  const type = routePrimaryType(userDescription ?? "");
  const { ordered, done } = activeDimensions(type, precision, history, GRADIENT, userDescription);

  // Build pool from ordered dimension ids
  const pool = ordered
    .map((qid) => manifest.find((d) => d.questionId === qid))
    .filter((d): d is NonNullable<typeof d> => d != null);

  // Current dimension is always ordered[0] (runtime-determined, not model-chosen)
  const currentQid = ordered[0] ?? "";

  const ctx: TurnContext = {
    pool,
    currentQuestionId: currentQid,
    allQuestionIds: new Set(manifest.map((d) => d.questionId)),
    validQuestionIds: new Set(pool.map((d) => d.questionId)),
    optionIdsByQuestion: new Map(
      pool.map((d) => [d.questionId, new Set(d.options.map((o) => o.id))])
    ),
    remainingQuestionIds: ordered,
    remainingEmpty: done,
    lastQuestionId: history.at(-1)?.questionId ?? "",
    tier: "detail", // legacy, always "detail" now
    type,
    precision,
    // Populated below after optionsForModel is computed; placeholder until then.
    filteredCurrentOptionIds: [],
  };

  // Pre-filter subject options by the portrait-only category so the model never
  // sees product/animal/food subjects even on fallback paths.
  const currentDim = pool[0];
  let optionsForModel = currentDim?.options ?? [];
  if (currentQid === "subject" && type !== "通用") {
    const allowed = getTypeFilteredSubjectOptionIds(type);
    if (allowed) {
      const filtered = optionsForModel.filter(o => allowed.has(o.id));
      if (filtered.length > 0) optionsForModel = filtered;
    }
  }
  // Back-fill ctx with the (possibly filtered) option id set.
  // parseTurnResponse uses this for fallback so out-of-category ids never appear.
  ctx.filteredCurrentOptionIds = optionsForModel.map(o => o.id);

  const toolParameters = {
    type: "object",
    properties: {
      visibleOptionIds: {
        type: "array",
        items: { type: "string" },
        description: `3-6 option ids from ${currentQid} that best match the user's intent. Only use ids from the provided list.`,
      },
      helperText: {
        type: "string",
        description: "一句简短中文，帮普通人理解这一步在选什么。",
      },
    },
    required: ["visibleOptionIds", "helperText"],
    additionalProperties: false,
  };

  const systemText = `${AGENT_SYSTEM_PROMPT}${buildAgentGuidance()}\n\n当前维度：${currentQid}（${currentDim?.title ?? ""}）\n可选选项：\n${JSON.stringify(optionsForModel)}`;

  const proxyReq = buildToolRequest(provider, apiKey, {
    model: provider.routingModel,
    maxTokens: provider.maxTokens ?? 512,
    systemText,
    userText: describeHistory(history, manifest, userDescription),
    tool: {
      name: "select_options",
      description: `Pick 3-6 best options for the ${currentQid} dimension and write a helperText.`,
      parameters: toolParameters,
    },
  });

  return { proxyReq, ctx };
}

/** Parse the raw LLM response into a typed decision.
 *  Pure: no logging. */
export function parseTurnResponse(
  provider: ProviderPreset,
  rawResp: unknown,
  ctx: TurnContext
): {
  rawInput: unknown;
  decision: AgentDecision | null;
  rawNextQuestionId: string | undefined;
  rawDone: boolean;
  droppedInvalidOptionIds: string[];
  attemptedTierJump: boolean;
} {
  const rawInput = extractToolInput(provider, rawResp, "select_options");

  // C-9b: nextQuestionId is always ctx.currentQuestionId (runtime-determined)
  const rawNextQuestionId = ctx.currentQuestionId;
  const rawDone = false; // model done is ignored; done is determined by activeDimensions

  // Extract visibleOptionIds from model response
  const requested = Array.isArray((rawInput as { visibleOptionIds?: unknown })?.visibleOptionIds)
    ? ((rawInput as { visibleOptionIds: unknown[] }).visibleOptionIds as unknown[])
    : [];
  const validIds = new Set(ctx.filteredCurrentOptionIds);
  const validOptionIds = requested.filter(
    (id): id is string => typeof id === "string" && validIds.has(id)
  );
  const droppedInvalidOptionIds = requested.filter(
    (id): id is string => typeof id === "string" && !validIds.has(id)
  );

  // Fallback: if model returned no valid options, use the pre-filtered option set
  // (ctx.filteredCurrentOptionIds) so out-of-category options never appear.
  // Note: validIds (from optionIdsByQuestion) is still used for ID validation above.
  const visibleOptionIds =
    validOptionIds.length > 0
      ? validOptionIds
      : ctx.filteredCurrentOptionIds.length > 0
        ? ctx.filteredCurrentOptionIds
        : [...validIds];

  // Extract helperText from model response
  const helperText = typeof (rawInput as { helperText?: unknown })?.helperText === "string"
    ? (rawInput as { helperText: string }).helperText
    : undefined;

  const decision: AgentDecision = {
    nextQuestionId: ctx.currentQuestionId,
    visibleOptionIds,
    done: false, // done is never model-determined in C-9b
    ...(helperText ? { helperText } : {}),
  };

  return { rawInput, decision, rawNextQuestionId, rawDone, droppedInvalidOptionIds, attemptedTierJump: false };
}

export interface TurnContext {
  pool: CatalogManifest;
  currentQuestionId: string;
  allQuestionIds: Set<string>;
  validQuestionIds: Set<string>;
  optionIdsByQuestion: Map<string, Set<string>>;
  remainingQuestionIds: string[];
  remainingEmpty: boolean;
  lastQuestionId: string;
  /** @deprecated use precision instead */
  tier: "overall" | "detail";
  type: string;
  precision: Precision;
  /** Option ids sent to the model for the current dimension (may be pre-filtered
   *  by primary type for the subject question). Used as the fallback set in
   *  parseTurnResponse so the fallback never shows out-of-category options. */
  filteredCurrentOptionIds: string[];
}

// ── public API ─────────────────────────────────────────────────────────────

/** Shared turn runner used by both the browser controller and the eval harness.
 *  C-9b: nextQuestionId is runtime-determined by activeDimensions.
 *  Model only picks visibleOptionIds + helperText. */
export async function runAgentTurn(
  provider: ProviderPreset,
  apiKey: string,
  args: { manifest: CatalogManifest; history: AgentHistoryItem[]; userDescription?: string; precision?: Precision },
  transport: (req: ProxyRequest) => Promise<unknown> = callProxy,
  opts: { maxCorrectionRetries?: number } = {}
): Promise<{ decision: AgentDecision; ctx: TurnContext; diagnostics: TurnDiagnostics }> {
  const { proxyReq, ctx } = buildTurnRequest(provider, apiKey, args);

  // Early exit: nothing remaining → synthesize done
  if (ctx.remainingEmpty) {
    const decision: AgentDecision = {
      nextQuestionId: ctx.lastQuestionId,
      visibleOptionIds: [],
      done: true,
    };
    const diagnostics: TurnDiagnostics = {
      rawNextQuestionId: undefined,
      rawDone: true,
      droppedInvalidOptionIds: [],
      attemptedTierJump: false,
      outOfPool: false,
      attempts: 0,
      corrected: false,
      fallbackUsed: false,
      source: "remainingEmpty",
      tier: ctx.tier,
    };
    return { decision, ctx, diagnostics };
  }

  // Call transport — retry on network errors only
  let resp: unknown;
  let attempts = 0;
  const maxRetries = opts.maxCorrectionRetries ?? 2;

  for (let t = 0; t <= maxRetries; t++) {
    attempts = t + 1;
    try {
      resp = await transport(proxyReq);
      break;
    } catch {
      if (t === maxRetries) {
        // All retries exhausted → fallback: use the pre-filtered option set
        // (respects category pre-filtering; avoids showing out-of-category options)
        const currentDim = ctx.pool[0];
        const fallbackIds = ctx.filteredCurrentOptionIds.length > 0
          ? ctx.filteredCurrentOptionIds
          : currentDim.options.map((o) => o.id);
        const fallbackDecision: AgentDecision = {
          nextQuestionId: ctx.currentQuestionId,
          visibleOptionIds: fallbackIds,
          done: false,
        };
        return {
          decision: fallbackDecision,
          ctx,
          diagnostics: {
            rawNextQuestionId: ctx.currentQuestionId,
            rawDone: false,
            droppedInvalidOptionIds: [],
            attemptedTierJump: false,
            outOfPool: false,
            attempts,
            corrected: false,
            fallbackUsed: true,
            source: "fallback",
            tier: ctx.tier,
            // No `usage` key: this path is reached only when every transport
            // attempt threw, so there is no provider response to read tokens from.
          },
        };
      }
    }
  }

  const parsed = parseTurnResponse(provider, resp!, ctx);

  return {
    decision: parsed.decision!,
    ctx,
    diagnostics: {
      rawNextQuestionId: parsed.rawNextQuestionId,
      rawDone: parsed.rawDone,
      droppedInvalidOptionIds: parsed.droppedInvalidOptionIds,
      attemptedTierJump: false, // legacy
      outOfPool: false, // legacy
      attempts,
      corrected: false, // legacy
      fallbackUsed: false,
      source: "ordered",
      tier: ctx.tier,
      usage: extractUsage(resp!),
    },
  };
}

export async function requestNextStep(
  provider: ProviderPreset,
  apiKey: string,
  args: { manifest: CatalogManifest; history: AgentHistoryItem[]; userDescription?: string; precision?: Precision },
  transport: (req: ProxyRequest) => Promise<unknown> = callProxy
): Promise<AgentDecision> {
  const { history, userDescription } = args;

  const { decision, ctx, diagnostics } = await runAgentTurn(provider, apiKey, args, transport);

  logAgent("request", {
    provider: provider.id,
    model: provider.routingModel,
    userDescription: userDescription?.trim() || undefined,
    askedSoFar: history.map((h) => h.questionId),
    remainingDimensions: ctx.remainingQuestionIds,
    tier: ctx.tier,
    type: ctx.type,
    precision: ctx.precision,
    offeredDimensions: ctx.pool.map((d) => d.questionId),
    history,
  });

  logAgent("decision", {
    nextQuestionId: decision.nextQuestionId,
    visibleOptionIds: decision.visibleOptionIds,
    done: decision.done,
    repeatedDimension: history.some((h) => h.questionId === decision.nextQuestionId),
    droppedInvalidOptionIds: diagnostics.droppedInvalidOptionIds.length > 0 ? diagnostics.droppedInvalidOptionIds : undefined,
    source: diagnostics.source,
    type: ctx.type,
    precision: ctx.precision,
  });
  return decision;
}

/** Browser adapter for the server-owned Adaptive Ask boundary. The browser
 * sends state and a credential only; the server owns catalog and model input. */
export async function requestAdaptiveTurn(
  apiKey: string,
  args: { subjectBrief: string; history: AgentHistoryItem[]; precision: Precision },
  fetcher: typeof fetch = fetch,
): Promise<AdaptiveTurnResult> {
  const response = await fetcher("/api/adaptive-turn", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text) as AdaptiveTurnResult;
  } catch {
    throw new Error(`Adaptive route returned non-JSON: ${text.slice(0, 200)}`);
  }
}

export async function polishPrompt(
  provider: ProviderPreset,
  apiKey: string,
  args: { zhPrompt: string; enPrompt: string }
): Promise<{ zh: string; en: string }> {
  const resp = await callProxy(
    buildToolRequest(provider, apiKey, {
      model: provider.polishModel,
      maxTokens: provider.maxTokens ?? 1024,
      systemText:
        "你是提示词润色助手。只优化措辞与连贯度，严禁新增、删除或改变用户已选的任何画面元素与语义。保持中英两版一致。",
      userText: `请分别润色以下两版提示词：\n\n中文：${args.zhPrompt}\n\nEnglish：${args.enPrompt}`,
      tool: POLISH_TOOL,
    })
  );

  const input = extractToolInput(provider, resp, POLISH_TOOL.name) as
    | { zh?: unknown; en?: unknown }
    | undefined;
  if (!input || typeof input.zh !== "string" || typeof input.en !== "string") {
    throw new Error("润色结果无法解析。");
  }
  return { zh: input.zh, en: input.en };
}

// ── auto-fill dimensions (Phase 2) ────────────────────────────────────────

const FILL_TOOL = {
  name: "fill_dimensions",
  description:
    "Auto-fill secondary image dimensions that the user hasn't covered. Pick 1-2 options per dimension that best match the user's existing selections. You may skip a dimension if none fit.",
  parameters: {
    type: "object",
    properties: {
      picks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionId: { type: "string", description: "dimension id" },
            optionIds: {
              type: "array",
              items: { type: "string" },
              description: "1-2 picked option ids for this dimension",
            },
          },
          required: ["questionId", "optionIds"],
          additionalProperties: false,
        },
      },
    },
    required: ["picks"],
    additionalProperties: false,
  },
} as const;

export interface AutoFillResult {
  questionId: string;
  selectedOptionIds: string[];
}

/**
 * LLM auto-completion for secondary dimensions the interactive flow skipped.
 *
 * - Sequential accumulation: each dimension's candidates are filtered against
 *   all prior picks + user selections (with caution conflicts included).
 * - One LLM call: sends all dimensions + their filtered candidates at once.
 * - Post-response validation: re-checks every option id against real catalog
 *   options and accumulated conflicts; drops invalid ones silently.
 * - Any failure → returns [] (never blocks prompt generation).
 *
 * A4 in the Phase 2 plan.
 */
export async function autoFillDimensions(
  provider: ProviderPreset,
  apiKey: string,
  args: {
    manifest: CatalogManifest;
    history: AgentHistoryItem[];
    fillSet: string[];
    userDescription?: string;
  },
  transport: (req: ProxyRequest) => Promise<unknown> = callProxy,
): Promise<AutoFillResult[]> {
  const { manifest, history, fillSet, userDescription } = args;

  if (fillSet.length === 0) return [];

  const withCoreHeuristic = (llmResults: AutoFillResult[]): AutoFillResult[] => {
    const gaps = heuristicFillGaps(
      fillSet,
      missingPortraitCoreFill(fillSet, llmResults.map((r) => r.questionId)),
      manifest,
      history,
      llmResults,
      userDescription,
    );
    return gaps.length > 0 ? [...llmResults, ...gaps] : llmResults;
  };

  try {
    // ── Sequential accumulation filtering ──
    // Start from all user-selected option ids
    const userSelectedIds = history.flatMap((h) => h.selectedOptionIds);
    const acc = new Set(userSelectedIds);

    // Build manifest lookup
    const manifestMap = new Map(manifest.map((d) => [d.questionId, d]));
    const allowedFillSet = new Set(fillSet);

    // Filter each fill dimension's options against accumulated conflicts
    const dimPayloads: Array<{
      questionId: string;
      title: string;
      options: Array<{ id: string; label: string }>;
    }> = [];

    for (const qid of fillSet) {
      const dim = manifestMap.get(qid);
      if (!dim || dim.mode === "free_text") continue;

      // Block options that conflict with accumulated selections (including caution)
      const blocked = conflictIdsFor(acc, { includeCaution: true });

      // Also get suggested ids for positive guidance
      const suggested = suggestedIdsFor(acc);

      const filteredOptions = dim.options
        .filter((o) => !blocked.has(o.id))
        .map((o) => ({
          id: o.id,
          label: o.label,
          suggested: suggested.has(o.id),
        }));

      if (filteredOptions.length === 0) continue;

      dimPayloads.push({
        questionId: qid,
        title: dim.title,
        options: filteredOptions.map((o) => ({
          id: o.id,
          label: o.label + (o.suggested ? " ★推荐" : ""),
        })),
      });

      // Tentatively add the first option to acc for next dimension's filtering
      // (conservative: assume at least one will be picked)
      if (filteredOptions.length > 0) {
        acc.add(filteredOptions[0].id);
      }
    }

    if (dimPayloads.length === 0) return withCoreHeuristic([]);

    // ── Build user message ──
    const userPicksDesc = history
      .filter((h) => h.selectedOptionIds.length > 0)
      .map((h) => {
        const dim = manifestMap.get(h.questionId);
        const labels = h.selectedOptionIds
          .map((id) => dim?.options.find((o) => o.id === id)?.label ?? id)
          .join("、");
        return `- ${dim?.title ?? h.questionId}：${labels}`;
      })
      .join("\n");

    const dimsDesc = dimPayloads
      .map(
        (d) =>
          `【${d.title}】(${d.questionId})\n可选：${d.options.map((o) => `${o.id}(${o.label})`).join("、")}`,
      )
      .join("\n\n");

    // Seed-faithfulness: without the original request, auto-fill defaults to the generic
    // portrait centroid (long_wavy hair, romantic mood, photorealistic style) and contradicts
    // any non-default seed — the dominant cause of adaptive losing to the bare seed
    // (docs/research/autofill-seed-blind-2026-06-03.md).
    const intentLine = userDescription?.trim()
      ? `用户的原始需求：「${userDescription.trim()}」。务必忠实于该需求——只补全与需求一致的取值，` +
        `绝不要添加与需求冲突的风格/发型/氛围/场景（例如需求是水彩、像素、油画、蒸汽波等非写实风格时，` +
        `不要补成写实摄影；主体若非长发女性，不要补长卷发；冷峻/暗黑题材不要补温馨浪漫氛围）。某维度若没有契合需求的选项，宁可跳过也不要乱补。 `
      : "";
    const systemText =
      "你是图片提示词助手。" + intentLine +
      "根据用户已选内容，为以下次要维度各挑 1-2 个最契合风格/主体的选项。" +
      "只能使用给定的 option id，不要编造。如果某个维度没有合适的选项，可以跳过该维度。" +
      "以 fill_dimensions 工具返回结果。";

    const userText = `用户已选：\n${userPicksDesc || "（无）"}\n\n待补全维度：\n${dimsDesc}`;

    // ── LLM call (one retry when tool output is empty — helps slow providers) ──
    const proxyReq = buildToolRequest(provider, apiKey, {
      model: provider.routingModel,
      maxTokens: provider.maxTokens ?? 512,
      systemText,
      userText,
      tool: FILL_TOOL,
    });

    let results: AutoFillResult[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = await transport(proxyReq);
      const rawInput = extractToolInput(provider, resp, FILL_TOOL.name) as
        | { picks?: unknown }
        | undefined;

      if (!rawInput || !Array.isArray(rawInput.picks)) continue;

      // ── Post-response validation ──
      const userAcc = new Set(userSelectedIds);
      const seen = new Set<string>();
      const attemptResults: AutoFillResult[] = [];

      for (const pick of rawInput.picks as Array<{ questionId?: unknown; optionIds?: unknown }>) {
        if (typeof pick.questionId !== "string" || !Array.isArray(pick.optionIds)) continue;
        if (!allowedFillSet.has(pick.questionId)) continue;
        if (seen.has(pick.questionId)) continue;
        seen.add(pick.questionId);

        const dim = manifestMap.get(pick.questionId);
        if (!dim) continue;

        const validOptionIds = new Set(dim.options.map((o) => o.id));
        const blocked = conflictIdsFor(userAcc, { includeCaution: true });

        const accepted: string[] = [];
        for (const oid of pick.optionIds) {
          if (typeof oid !== "string") continue;
          if (!validOptionIds.has(oid)) continue;
          if (blocked.has(oid)) continue;
          accepted.push(oid);
        }

        if (dim.mode === "single") {
          if (accepted.length === 0) continue;
          accepted.length = 1;
        } else if (accepted.length > 2) {
          accepted.length = 2;
        }
        if (accepted.length === 0) continue;

        attemptResults.push({
          questionId: pick.questionId,
          selectedOptionIds: accepted,
        });

        for (const oid of accepted) userAcc.add(oid);
      }

      results = attemptResults;
      if (results.length > 0) break;
    }

    return withCoreHeuristic(results);
  } catch {
    return withCoreHeuristic([]);
  }
}
