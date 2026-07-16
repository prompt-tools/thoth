/** Wire format a provider speaks. Most Chinese / third-party models
 *  (DeepSeek, MiMo, Kimi, Zhipu, MiniMax, …) are OpenAI-compatible. */
export type ProviderFormat = "anthropic" | "openai";

export interface ProviderPreset {
  id: string;
  label: string;
  format: ProviderFormat;
  /** Base URL WITHOUT the trailing path. anthropic → +"/v1/messages",
   *  openai → +"/chat/completions". */
  baseURL: string;
  /** Cheap/fast model for the routing (next-step) decision. */
  routingModel: string;
  /** More fluent model for optional prompt polish. */
  polishModel: string;
  /** Max completion tokens per tool call. Reasoning models (e.g. MiMo v2.5)
   *  spend most of the budget on hidden reasoning before emitting the tool
   *  call, so they need a much larger cap than 512. Defaults to 512. */
  maxTokens?: number;
  /** Extra fields merged into the OpenAI-format request body. Used to disable
   *  a reasoning model's thinking for this mechanical narrowing task (much
   *  faster / cheaper / fewer rate-limit hits, and thinking adds little here). */
  extraBody?: Record<string, unknown>;
}

/** Built-in presets. Adding a provider = one entry here (plus its host in the
 *  /api/llm allowlist if it's a brand-new host). */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "deepseek",
    label: "DeepSeek V4-flash",
    format: "openai",
    baseURL: "https://api.deepseek.com",
    routingModel: "deepseek-v4-flash",
    polishModel: "deepseek-v4-flash",
    extraBody: { thinking: { type: "disabled" } },
  },
  {
    id: "mimo",
    label: "小米 MiMo (v2.5, 订阅)",
    format: "openai",
    // Subscription (token-plan) gateway — different host from pay-per-use
    // api.xiaomimimo.com. Serves mimo-v2.5 / v2.5-pro (reasoning models).
    baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
    routingModel: "mimo-v2.5",
    polishModel: "mimo-v2.5-pro",
    // mimo-v2.5 is a reasoning model. We DISABLE thinking for this mechanical
    // option-narrowing task (≈5× cheaper/faster, fewer rate-limit hits, and the
    // official docs warn thinking-on multi-turn tool calls require echoing
    // reasoning_content or 400 — which our harness doesn't do).
    // `thinking:{type:"disabled"}` is the official platform API param
    // (docs: api/chat/openai-api); verified reasoning 256→0 on the token-plan
    // gateway. With thinking off the tool call fits easily, but keep headroom.
    maxTokens: 2048,
    extraBody: { thinking: { type: "disabled" } },
  },
  {
    id: "stepfun",
    label: "阶跃 Step Plan (step-3.5-flash-2603)",
    format: "openai",
    // Step 套餐 / Step Plan 推理路径（OpenAI 兼容）
    baseURL: "https://api.stepfun.com/step_plan/v1",
    routingModel: "step-3.5-flash-2603",
    polishModel: "step-3.5-flash-2603",
    maxTokens: 2048,
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    format: "anthropic",
    baseURL: "https://api.anthropic.com",
    routingModel: "claude-haiku-4-5-20251001",
    polishModel: "claude-sonnet-4-6",
  },
];

export const DEFAULT_PROVIDER_ID = "deepseek";

export function getProvider(id: string): ProviderPreset {
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? PROVIDER_PRESETS[0];
}
