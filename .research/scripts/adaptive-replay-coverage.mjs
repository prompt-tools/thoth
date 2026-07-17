import { buildCatalogManifest } from "../../src/lib/prompt/agent/catalog-manifest.ts";

const EXPECTED_CASE = {
  "valid.ask": "valid-ask",
  "valid.zero_turn_completion": "valid-zero-turn-completion",
  "valid.later_completion": "valid-later-completion",
  "network.timeout": "network-timeout",
  "finish.length": "finish-length",
  "finish.content_filter": "finish-content_filter",
  "finish.insufficient_system_resource": "finish-insufficient_system_resource",
  "finish.missing": "finish-missing",
  "tool.missing_call": "tool-missing-call",
  "tool.wrong_function": "tool-wrong-function",
  "tool.multiple_calls": "tool-multiple-calls",
  "tool.invalid_json": "tool-invalid-json",
  "tool.non_object": "tool-non-object",
  "tool.extra_field": "tool-extra-field",
  "ask.blank_text": "ask-blank-text",
  "ask.overlong_text": "ask-overlong-text",
  "ask.wrong_nullability": "ask-wrong-nullability",
  "ask.duplicate_ids": "ask-duplicate-ids",
  "ask.two_ids": "ask-two-ids",
  "ask.seven_ids": "ask-seven-ids",
  "catalog.unknown_question": "catalog-unknown-question",
  "catalog.wrong_dimension_id": "catalog-wrong-dimension",
  "catalog.out_of_allowlist_id": "catalog-out-of-allowlist",
  "catalog.stale_id": "catalog-stale-id",
  "semantics.repeat": "semantic-repeat",
  "semantics.must_not_ask": "semantic-must-not-ask",
  "semantics.known_fact_conflict": "semantic-known-fact-conflict",
  "semantics.delivery_conflict": "semantic-delivery-conflict",
  "semantics.budget_overrun": "semantic-budget-overrun",
  "completion.premature": "completion-premature",
  "completion.over_budget": "semantic-budget-overrun",
  "completion.blocking_dependency": "completion-blocking-dependency",
  "boundary.request_65536": "request-boundary-65536",
  "boundary.request_65537": "request-boundary-65537",
  "boundary.response_65536": "response-boundary-65536",
  "boundary.response_65537": "response-boundary-65537",
  "fallback.safe_eligible_ask": "fallback-safe-ask",
  "fallback.remaining_empty": "valid-zero-turn-completion",
  "fallback.no_safe_error": "fallback-no-safe-error",
  "invariant.subject_after_brief": "catalog-subject-after-brief",
  "invariant.raw_id_not_salvaged": "catalog-stale-id",
  "invariant.free_text_available": "valid-ask",
  "invariant.ui_action_parity": "valid-ask",
  "invariant.ui_question_parity": "valid-ask",
  "invariant.ui_order_parity": "valid-ask",
  "invariant.ask_to_completion_confusion": "ask-wrong-nullability",
  "invariant.completion_to_ask_confusion": "completion-wrong-nullability",
  "invariant.pillar_incomplete_completion": "completion-premature",
};
for (const status of [400, 401, 402, 422, 429, 500, 503]) EXPECTED_CASE[`http.${status}`] = `http-${status}`;

function toolArguments(record) {
  if (typeof record.recording.toolArgumentsRaw !== "string") return null;
  try { return JSON.parse(record.recording.toolArgumentsRaw); } catch { return null; }
}

function rawBodyLength(record) {
  return record.recording.kind === "http" ? Buffer.from(record.recording.bodyBase64, "base64").byteLength : null;
}

function providerEnvelope(record) {
  if (record.recording.kind !== "http") return null;
  try { return JSON.parse(Buffer.from(record.recording.bodyBase64, "base64").toString("utf8")); } catch { return null; }
}

function semanticEvidence(branch, record, observation) {
  const args = toolArguments(record);
  const envelope = providerEnvelope(record);
  const toolCalls = envelope?.choices?.[0]?.message?.tool_calls;
  const { normalized, ui } = observation;
  if (branch.startsWith("http.")) {
    const status = Number(branch.slice(5));
    return record.recording.status === status && normalized.reason === `http_${status}`;
  }
  if (branch.startsWith("finish.")) {
    const expected = branch === "finish.missing" ? null : branch.slice(7);
    const choice = envelope?.choices?.[0];
    const rawFinishReason = choice?.finish_reason ?? null;
    const rawHasFinishReason = choice ? Object.hasOwn(choice, "finish_reason") : false;
    return record.recording.finishReason === expected
      && rawFinishReason === expected
      && (expected === null ? !rawHasFinishReason && observation.raw.evidence.finishReason == null : observation.raw.evidence.finishReason === expected)
      && normalized.reason === "finish_reason";
  }
  if (branch === "network.timeout") return record.recording.kind === "network" && record.recording.reason === "adaptive_turn_timeout" && normalized.reason === "adaptive_turn_timeout";
  if (branch === "valid.ask") return normalized.source === "model" && normalized.action === "ask";
  if (branch === "valid.later_completion") return record.input.history.length > 0 && normalized.source === "model" && normalized.action === "completion";
  if (branch === "valid.zero_turn_completion") return record.input.history.length === 0 && normalized.action === "completion";
  if (branch === "catalog.unknown_question") {
    const known = new Set(buildCatalogManifest().map((item) => item.questionId));
    return typeof args?.nextQuestionId === "string" && !known.has(args.nextQuestionId) && normalized.reason === "ineligible_dimension";
  }
  if (branch === "tool.missing_call") return Array.isArray(toolCalls) && toolCalls.length === 0 && normalized.reason === "tool_envelope";
  if (branch === "tool.wrong_function") return toolCalls?.length === 1 && toolCalls[0]?.function?.name !== "decide_adaptive_turn" && normalized.reason === "tool_envelope";
  if (branch === "tool.multiple_calls") return Array.isArray(toolCalls) && toolCalls.length > 1 && normalized.reason === "tool_envelope";
  if (branch === "tool.invalid_json") return typeof record.recording.toolArgumentsRaw === "string" && args === null && normalized.reason === "tool_arguments_invalid_json";
  if (branch === "tool.non_object") return Array.isArray(args) && normalized.reason === "tool_arguments";
  if (branch === "tool.extra_field") return args?.unexpected === true && normalized.reason === "schema";
  if (branch === "ask.blank_text") return args?.done === false && typeof args.questionText === "string" && args.questionText.trim() === "" && normalized.reason === "ask_text";
  if (branch === "ask.overlong_text") return args?.done === false && typeof args.questionText === "string" && args.questionText.length > 200 && normalized.reason === "ask_text";
  if (branch === "ask.wrong_nullability") return args?.done === false && args.helperText === null && normalized.reason === "ask_text";
  if (branch === "ask.duplicate_ids") return args?.done === false && Array.isArray(args.optionIds) && args.optionIds.length >= 3 && new Set(args.optionIds).size < args.optionIds.length && normalized.reason === "option_cardinality";
  if (branch === "ask.two_ids") return args?.done === false && Array.isArray(args.optionIds) && args.optionIds.length === 2 && new Set(args.optionIds).size === 2 && normalized.reason === "option_cardinality";
  if (branch === "ask.seven_ids") return args?.done === false && Array.isArray(args.optionIds) && args.optionIds.length === 7 && normalized.reason === "option_cardinality";
  if (branch === "invariant.subject_after_brief") return record.input.subjectBrief.length > 0 && args?.nextQuestionId === "subject" && normalized.source === "fallback";
  if (branch.startsWith("catalog.") && args?.done === false && Array.isArray(args.optionIds)) {
    const allowed = new Set(normalized.questionId === args.nextQuestionId ? normalized.optionIds : []);
    const invalidIds = args.optionIds.filter((id) => !allowed.has(id));
    const expectedPrefix = `image_${args.nextQuestionId}:`;
    if (branch === "catalog.wrong_dimension_id") return invalidIds.some((id) => !id.startsWith(expectedPrefix)) && normalized.reason === "option_allowlist";
    if (branch === "catalog.out_of_allowlist_id") return invalidIds.some((id) => id.startsWith(expectedPrefix) && !id.includes("legacy")) && normalized.reason === "option_allowlist";
    if (branch === "catalog.stale_id") return invalidIds.some((id) => id.startsWith(expectedPrefix) && id.includes("legacy")) && normalized.reason === "option_allowlist";
  }
  if (branch === "semantics.repeat") return record.input.history.some((answer) => answer.questionId === args?.nextQuestionId) && normalized.reason === "ineligible_dimension";
  if (branch === "semantics.must_not_ask") return args?.nextQuestionId === record.forbiddenUiQuestionId && ui.questionId === "framing" && normalized.reason === "ineligible_dimension";
  if (branch === "semantics.known_fact_conflict") return args?.nextQuestionId === "body_type" && record.forbiddenUiQuestionId === "body_type" && normalized.reason === "ineligible_dimension";
  if (branch === "semantics.delivery_conflict") return args?.nextQuestionId === record.forbiddenUiQuestionId && ui.questionId === "use_case" && normalized.reason === "ineligible_dimension";
  if (branch === "boundary.request_65536") return observation.raw.requestBytes === 65_536 && observation.raw.exchangeCalls === 1;
  if (branch === "boundary.request_65537") return observation.raw.requestBytes === null && normalized.reason === "request_too_large";
  if (branch === "boundary.response_65536") return rawBodyLength(record) === 65_536 && normalized.reason === "invalid_json";
  if (branch === "boundary.response_65537") return rawBodyLength(record) === 65_537 && normalized.reason === "response_too_large";
  if (branch === "fallback.remaining_empty") return normalized.source === "remainingEmpty" && normalized.action === "completion";
  if (branch === "fallback.no_safe_error") return ui.action === "error" && ui.code === "no_safe_adaptive_turn";
  if (branch === "fallback.safe_eligible_ask") return normalized.source === "fallback" && normalized.action === "ask";
  if (branch === "semantics.budget_overrun" || branch === "completion.over_budget") return ui.action === "error" && ui.code === "history_budget_exhausted";
  if (branch === "invariant.raw_id_not_salvaged") return record.forbiddenUiIds?.every((id) => !ui.optionIds.includes(id)) === true;
  if (branch === "invariant.free_text_available") return ui.action === "ask" && ui.freeTextAvailable === true;
  if (branch === "invariant.ui_action_parity") return ui.action === normalized.action;
  if (branch === "invariant.ui_question_parity") return ui.questionId === normalized.questionId;
  if (branch === "invariant.ui_order_parity") return JSON.stringify(ui.optionIds) === JSON.stringify(normalized.optionIds);
  if (branch === "invariant.ask_to_completion_confusion") return args?.done === false && normalized.action !== "completion";
  if (branch === "invariant.completion_to_ask_confusion") return args?.done === true && normalized.source !== "model";
  if (branch === "invariant.pillar_incomplete_completion") return args?.done === true && normalized.reason === "premature_completion";
  if (branch === "completion.premature") return args?.done === true && normalized.reason === "premature_completion" && normalized.questionId === "framing";
  if (branch === "completion.blocking_dependency") return args?.done === true && normalized.reason === "premature_completion" && normalized.questionId === "scene";
  return false;
}

export function validateBranchClaims(records, observations, requiredBranches) {
  const observationByCase = new Map(observations.map((item) => [item.caseId, item]));
  const claims = new Map();
  for (const record of records) {
    for (const branch of record.covers ?? []) claims.set(branch, [...(claims.get(branch) ?? []), record]);
  }
  const missingBranches = [];
  const invalidBranchClaims = [];
  for (const branch of requiredBranches) {
    const recordsForBranch = claims.get(branch) ?? [];
    if (!recordsForBranch.length) {
      missingBranches.push(branch);
      continue;
    }
    const valid = recordsForBranch.some((record) => {
      const observation = observationByCase.get(record.caseId);
      return record.caseId === EXPECTED_CASE[branch] && observation?.outcome.pass && semanticEvidence(branch, record, observation);
    });
    if (!valid) invalidBranchClaims.push(branch);
  }
  return { missingBranches, invalidBranchClaims, coveredBranchCount: requiredBranches.length - missingBranches.length - invalidBranchClaims.length };
}
