// LLM-as-user answerer: Claude haiku picks the seed-faithful option(s) per question.
// Pure builders/parser here; the network llmAnswer is added in Task 2.
// Reuses the client.ts wire-format pattern (copied, since those helpers are module-private).

const ANTHROPIC_VERSION = "2023-06-01";
const ANSWERER_MAX_TOKENS = 1024; // anthropic preset has no maxTokens of its own

/** The forced `answer` tool — `pick` is constrained to the visible ids via enum. */
export function buildAnswerTool(visibleIds) {
  return {
    name: "answer",
    description: "Pick the option id(s) that best realize the user's intent for this question.",
    parameters: {
      type: "object",
      properties: {
        pick: { type: "array", items: { type: "string", enum: visibleIds }, description: "Chosen option id(s)." },
        free_text: { type: "string", description: "Only for free-text questions, or a short detail no option covers." },
        skip: { type: "boolean", description: "True only if no option fits the intent." },
      },
      required: ["pick"],
    },
  };
}

/** Mirror of client.ts's provider.format branch for the `answer` tool. */
export function buildAnswerRequest(provider, apiKey, { system, userText, tool, maxTokens = ANSWERER_MAX_TOKENS }) {
  if (provider.format === "anthropic") {
    return {
      endpoint: `${provider.baseURL}/v1/messages`,
      headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
      body: {
        model: provider.routingModel,
        max_tokens: maxTokens,
        system,
        tools: [{ name: tool.name, description: tool.description, input_schema: tool.parameters }],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content: userText }],
      },
    };
  }
  return {
    endpoint: `${provider.baseURL}/chat/completions`,
    headers: { authorization: `Bearer ${apiKey}` },
    body: {
      model: provider.routingModel,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userText },
      ],
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
      ...(provider.extraBody ?? {}),
    },
  };
}

/** Pull the forced tool input from either wire format (mirrors client.ts extractToolInput). */
function extractToolInput(provider, resp, toolName = "answer") {
  if (provider.format === "anthropic") {
    return resp?.content?.find((b) => b.type === "tool_use" && b.name === toolName)?.input ?? null;
  }
  const calls = resp?.choices?.[0]?.message?.tool_calls;
  const call = calls?.find((c) => c.function?.name === toolName) ?? calls?.[0];
  const raw = call?.function?.arguments;
  if (raw == null) return null;
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Validate the model's answer into the harness shape, or null if it produced no
 * usable non-skip answer (caller does the deterministic fallback).
 * @returns {pickedIds, freeText, skipped, kind} | null
 */
export function parseAnswer(resp, provider, { visibleIds, mode, min, max }) {
  const input = extractToolInput(provider, resp);
  if (!input || typeof input !== "object") return null;
  const skip = input.skip === true;
  const freeText = typeof input.free_text === "string" && input.free_text.trim() ? input.free_text.trim() : undefined;

  if (mode === "free_text") {
    if (freeText) return { pickedIds: [], freeText, skipped: false, kind: "freetext" };
    return { pickedIds: [], freeText: undefined, skipped: true, kind: "skip" };
  }

  let picks = Array.isArray(input.pick) ? input.pick.filter((id) => visibleIds.includes(id)) : [];
  if (skip && picks.length === 0) return { pickedIds: [], freeText, skipped: true, kind: "skip" };

  // min is not enforced beyond the implicit 1: every image dimension has
  // minSelections undefined, so any single valid pick satisfies it.
  const maxN = Math.min(max ?? visibleIds.length, visibleIds.length);
  if (mode === "single") picks = picks.slice(0, 1);
  else picks = picks.slice(0, maxN);

  if (picks.length === 0) {
    if (freeText) return { pickedIds: [], freeText, skipped: false, kind: "freetext" };
    return null;
  }
  return { pickedIds: picks, freeText, skipped: false, kind: "pick" };
}

/** Build the system + user prompt a real user would effectively see. */
export function buildAnswerPrompt(dim, visible, seed, priorAnswers) {
  const opts = visible.map((o) => `- ${o.id}: ${o.label}`).join("\n");
  const prior = (priorAnswers ?? [])
    .filter((h) => (h.selectedOptionIds?.length ?? 0) > 0 || h.freeText)
    .map((h) => `  ${h.questionId}: ${h.freeText || (h.selectedOptionIds || []).join(", ")}`)
    .join("\n");
  const system =
    `你在扮演一个有明确意图的用户，需求是：「${seed}」。\n` +
    `面对每个问题，从给出的选项里挑选最能实现该需求的一个或多个；只有当所有选项都明显不相关时才 skip；` +
    `free_text 只用于自由文本题或补充选项未覆盖的关键细节。像一个普通用户那样选择，而不是追求理论最优。`;
  const userText =
    `# 问题\n${dim.title}（${dim.helper}）\n\n# 可选项（只能从这些 id 里选）\n${opts}\n\n` +
    (prior ? `# 已答\n${prior}\n\n` : "") +
    `请调用 answer 工具作答。`;
  return { system, userText };
}

async function fetchAnswer(fetchImpl, req, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetchImpl(req.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...req.headers },
      body: JSON.stringify(req.body),
    });
    if (res.status === 429 && attempt < retries) { await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); continue; }
    if (!res.ok) throw new Error(`answerer HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("answerer: retries exhausted");
}

/**
 * @param ctx { seed, priorAnswers, bounds, provider, apiKey, fetchImpl? }
 * @returns {pickedIds, freeText, skipped, kind, fallback}
 */
export async function llmAnswer(dim, shown, ctx) {
  const visible = shown.visible ?? [];
  const visibleIds = visible.map((o) => o.id);
  if (visibleIds.length === 0) return { pickedIds: [], freeText: undefined, skipped: true, kind: "skip", fallback: false };

  const tool = buildAnswerTool(visibleIds);
  const { system, userText } = buildAnswerPrompt(dim, visible, ctx.seed, ctx.priorAnswers);
  const req = buildAnswerRequest(ctx.provider, ctx.apiKey, { system, userText, tool });
  const fetchImpl = ctx.fetchImpl ?? fetch;

  try {
    const resp = await fetchAnswer(fetchImpl, req);
    const parsed = parseAnswer(resp, ctx.provider, { visibleIds, mode: dim.mode, min: ctx.bounds?.min, max: ctx.bounds?.max });
    if (parsed) return { ...parsed, fallback: false };
  } catch { /* fall through to deterministic fallback */ }

  if (dim.mode === "free_text") return { pickedIds: [], freeText: undefined, skipped: true, kind: "skip", fallback: true };
  return { pickedIds: [visibleIds[0]], freeText: undefined, skipped: false, kind: "pick", fallback: true };
}
