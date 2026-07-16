import { activeDimensions } from "./active-dimensions";
import { hardConflictIdsFor } from "./audit-model";
import { buildCatalogManifest, type CatalogDimension } from "./catalog-manifest";
import type { AgentDecision, AgentHistoryItem } from "./decision";
import { GRADIENT } from "./gradient";

export const ADAPTIVE_MODEL = "deepseek-v4-flash";
export const ADAPTIVE_ENDPOINT = "https://api.deepseek.com/chat/completions";
export const ADAPTIVE_MAX_BYTES = 65_536;

type Pillar = "characterSignature" | "narrativeBehavior" | "visualWorld" | "presentationPurpose";

export interface AdaptiveEligibleDimension {
  questionId: string;
  title: string;
  helper: string;
  mode: CatalogDimension["mode"];
  pillar: Pillar;
  candidates: CatalogDimension["options"];
}

export interface AdaptiveTurnSnapshot {
  contractVersion: "adaptive-question-turn-v1";
  subjectBrief: string;
  history: AgentHistoryItem[];
  knownFacts: Array<{
    dimension: string;
    value: string;
    source: "brief" | "history";
    specificity: "exact" | "broad";
    pillar: Pillar;
    materiallyDifferentiating: boolean;
  }>;
  budget: { class: "sparse"; limit: 10; used: number; remaining: number };
  eligibleDimensions: AdaptiveEligibleDimension[];
}

export interface AdaptiveTurnResult {
  decision: AgentDecision;
  diagnostics: { source: "model" | "fallback"; reason?: string };
}

const SYSTEM_PROMPT = `你是人像/角色图片向导的出题智能体。只调用 decide_adaptive_turn 一次。
从服务器提供的 eligibleDimensions 中选择当前最能增加差异化信息的一题。不要询问已知事实，不要发明问题或选项。
Ask 必须返回 done=false、一个 eligible questionId、自然的中文 questionText/helperText，以及该维度 3-6 个唯一 optionIds。`;

function pillarFor(questionId: string): Pillar {
  if (/^(use_case|composition|framing|camera|aspect_ratio|detail|post)/.test(questionId)) return "presentationPurpose";
  if (/^(pose|expression|action|character_interaction|prop)/.test(questionId)) return "narrativeBehavior";
  if (/^(scene|background|lighting|art_style|color|mood)/.test(questionId)) return "visualWorld";
  return "characterSignature";
}

function isHistoryItem(value: unknown): value is AgentHistoryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.questionId === "string"
    && Array.isArray(item.selectedOptionIds)
    && item.selectedOptionIds.every((id) => typeof id === "string")
    && (item.freeText === undefined || typeof item.freeText === "string");
}

export function buildAdaptiveTurnSnapshot(input: unknown): AdaptiveTurnSnapshot {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_request");
  const raw = input as Record<string, unknown>;
  const subjectBrief = typeof raw.subjectBrief === "string" ? raw.subjectBrief.trim() : "";
  if (!subjectBrief) throw new Error("subject_brief_required");
  const precision = raw.precision;
  if (precision !== "simple" && precision !== "standard" && precision !== "detailed") {
    throw new Error("invalid_precision");
  }
  if (!Array.isArray(raw.history) || !raw.history.every(isHistoryItem)) throw new Error("invalid_history");
  const history = raw.history;
  const manifest = buildCatalogManifest();
  const manifestMap = new Map(manifest.map((dimension) => [dimension.questionId, dimension]));
  for (const item of history) {
    const dimension = manifestMap.get(item.questionId);
    if (!dimension || item.questionId === "subject") throw new Error("invalid_history_dimension");
    const allowed = new Set(dimension.options.map((option) => option.id));
    if (item.selectedOptionIds.some((id) => !allowed.has(id))) throw new Error("invalid_history_option");
  }

  const selectedIds = history.flatMap((item) => item.selectedOptionIds);
  const blockedIds = hardConflictIdsFor(selectedIds);
  // Adaptive routing chooses from every semantically applicable portrait dimension;
  // Journey budgets, not the legacy UI precision tiers, limit how many are asked.
  const { ordered } = activeDimensions("人像", "detailed", history, GRADIENT, subjectBrief);
  const eligibleDimensions = ordered
    .filter((questionId) => questionId !== "subject")
    .map((questionId) => manifestMap.get(questionId))
    .filter((dimension): dimension is CatalogDimension => Boolean(dimension))
    .map((dimension): AdaptiveEligibleDimension => ({
      questionId: dimension.questionId,
      title: dimension.title,
      helper: dimension.helper,
      mode: dimension.mode,
      pillar: pillarFor(dimension.questionId),
      candidates: dimension.options.filter((option) => !blockedIds.has(option.id)),
    }))
    .filter((dimension) => dimension.candidates.length >= 3);
  if (eligibleDimensions.length === 0) throw new Error("no_eligible_dimension");

  const knownFacts: AdaptiveTurnSnapshot["knownFacts"] = [{
    dimension: "subject",
    value: subjectBrief,
    source: "brief",
    specificity: "broad",
    pillar: "characterSignature",
    materiallyDifferentiating: true,
  }];
  for (const item of history) {
    const dimension = manifestMap.get(item.questionId)!;
    const value = item.freeText?.trim() || item.selectedOptionIds
      .map((id) => dimension.options.find((option) => option.id === id)?.label ?? id)
      .join("、");
    knownFacts.push({
      dimension: item.questionId,
      value,
      source: "history",
      specificity: "exact",
      pillar: pillarFor(item.questionId),
      materiallyDifferentiating: true,
    });
  }

  return {
    contractVersion: "adaptive-question-turn-v1",
    subjectBrief,
    history,
    knownFacts,
    budget: { class: "sparse", limit: 10, used: history.length, remaining: 10 - history.length },
    eligibleDimensions,
  };
}

export function buildAdaptiveProviderBody(snapshot: AdaptiveTurnSnapshot) {
  return {
    model: ADAPTIVE_MODEL,
    max_tokens: 512,
    temperature: 0,
    top_p: 1,
    stream: false,
    thinking: { type: "disabled" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(snapshot) },
    ],
    tools: [{
      type: "function",
      function: {
        name: "decide_adaptive_turn",
        description: "Choose the next Adaptive Ask and its catalog candidates.",
        parameters: {
          type: "object",
          properties: {
            done: { type: "boolean" },
            nextQuestionId: { anyOf: [{ type: "string" }, { type: "null" }] },
            questionText: { anyOf: [{ type: "string" }, { type: "null" }] },
            helperText: { anyOf: [{ type: "string" }, { type: "null" }] },
            optionIds: { type: "array", items: { type: "string" } },
          },
          required: ["done", "nextQuestionId", "questionText", "helperText", "optionIds"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "decide_adaptive_turn" } },
  };
}

function validText(value: unknown): value is string {
  return typeof value === "string" && [...value.trim()].length >= 1 && [...value.trim()].length <= 200;
}

export function normalizeAdaptiveResponse(raw: unknown, snapshot: AdaptiveTurnSnapshot): AdaptiveTurnResult {
  try {
    const response = raw as {
      choices?: Array<{
        finish_reason?: unknown;
        message?: { tool_calls?: Array<{ function?: { name?: unknown; arguments?: unknown } }> };
      }>;
    };
    const choice = response.choices?.[0];
    if (choice?.finish_reason !== "tool_calls") throw new Error("finish_reason");
    const calls = choice.message?.tool_calls;
    if (!Array.isArray(calls) || calls.length !== 1 || calls[0]?.function?.name !== "decide_adaptive_turn") {
      throw new Error("tool_envelope");
    }
    const encoded = calls[0].function?.arguments;
    if (typeof encoded !== "string") throw new Error("tool_arguments");
    const value = JSON.parse(encoded) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("tool_arguments");
    const input = value as Record<string, unknown>;
    const allowedKeys = ["done", "nextQuestionId", "questionText", "helperText", "optionIds"];
    if (Object.keys(input).length !== allowedKeys.length || Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      throw new Error("schema");
    }
    if (input.done !== false || typeof input.nextQuestionId !== "string") throw new Error("ask_shape");
    if (!validText(input.questionText) || !validText(input.helperText)) throw new Error("ask_text");
    if (!Array.isArray(input.optionIds) || input.optionIds.some((id) => typeof id !== "string")) throw new Error("option_shape");
    const optionIds = input.optionIds as string[];
    if (optionIds.length < 3 || optionIds.length > 6 || new Set(optionIds).size !== optionIds.length) {
      throw new Error("option_cardinality");
    }
    const dimension = snapshot.eligibleDimensions.find((item) => item.questionId === input.nextQuestionId);
    if (!dimension) throw new Error("ineligible_dimension");
    const allowedIds = new Set(dimension.candidates.map((option) => option.id));
    if (optionIds.some((id) => !allowedIds.has(id))) throw new Error("option_allowlist");
    return {
      decision: {
        nextQuestionId: input.nextQuestionId,
        questionText: input.questionText.trim(),
        helperText: input.helperText.trim(),
        visibleOptionIds: optionIds,
        done: false,
      },
      diagnostics: { source: "model" },
    };
  } catch (error) {
    return fallbackAdaptiveTurn(snapshot, error instanceof Error ? error.message : "invalid_response");
  }
}

export function fallbackAdaptiveTurn(snapshot: AdaptiveTurnSnapshot, reason: string): AdaptiveTurnResult {
  const dimension = snapshot.eligibleDimensions[0];
  return {
    decision: {
      nextQuestionId: dimension.questionId,
      questionText: dimension.title,
      helperText: dimension.helper,
      visibleOptionIds: dimension.candidates.slice(0, 6).map((option) => option.id),
      done: false,
    },
    diagnostics: { source: "fallback", reason },
  };
}
