import "../../src/lib/prompt/init.ts";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildAdaptiveProviderBody, buildAdaptiveTurnSnapshot } from "../../src/lib/prompt/agent/adaptive-turn.ts";
import { buildCatalogManifest } from "../../src/lib/prompt/agent/catalog-manifest.ts";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const FIXED_NOW = 1_700_000_000_000;
export const TURN_SECRET = "adaptive-replay-fixed-secret-at-least-32-bytes";
export const ARTIFACT_VERSION = "adaptive-replay-artifact-v2";
export const CORPUS_VERSION = "adaptive-question-recordings-v1";
export const REQUIRED_BRANCHES = [
  "valid.ask", "valid.zero_turn_completion", "valid.later_completion",
  "http.400", "http.401", "http.402", "http.422", "http.429", "http.500", "http.503", "network.timeout",
  "finish.length", "finish.content_filter", "finish.insufficient_system_resource", "finish.missing",
  "tool.missing_call", "tool.wrong_function", "tool.multiple_calls", "tool.invalid_json", "tool.non_object", "tool.extra_field",
  "ask.blank_text", "ask.overlong_text", "ask.wrong_nullability", "ask.duplicate_ids", "ask.two_ids", "ask.seven_ids",
  "catalog.unknown_question", "catalog.wrong_dimension_id", "catalog.out_of_allowlist_id", "catalog.stale_id",
  "semantics.repeat", "semantics.must_not_ask", "semantics.known_fact_conflict", "semantics.delivery_conflict", "semantics.budget_overrun",
  "completion.premature", "completion.over_budget", "completion.blocking_dependency",
  "boundary.request_65536", "boundary.request_65537", "boundary.response_65536", "boundary.response_65537",
  "fallback.safe_eligible_ask", "fallback.remaining_empty", "fallback.no_safe_error",
  "invariant.subject_after_brief", "invariant.raw_id_not_salvaged", "invariant.free_text_available",
  "invariant.ui_action_parity", "invariant.ui_question_parity", "invariant.ui_order_parity",
  "invariant.ask_to_completion_confusion", "invariant.completion_to_ask_confusion", "invariant.pillar_incomplete_completion",
];

function productionFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(absolute);
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) return [];
    return [path.relative(ROOT, absolute)];
  });
}

const PRODUCTION_FILES = [...productionFiles(path.join(ROOT, "src")), "package-lock.json"].sort();
const EVALUATOR_FILES = [
  ".research/scripts/eval-adaptive.mjs",
  ".research/scripts/adaptive-replay-support.mjs",
  ".research/scripts/adaptive-replay-coverage.mjs",
];

export function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function digestBytes(bytes) {
  if (bytes === undefined || bytes === null) return { bytes: null, hash: null };
  return { bytes: bytes.byteLength, hash: sha256(bytes) };
}

function digestValue(value) {
  if (value === undefined) return { bytes: null, hash: null };
  const encoded = typeof value === "string" ? value : stableJson(value);
  return digestBytes(Buffer.from(encoded, "utf8"));
}

function fileHash(relativePath) {
  return sha256(fs.readFileSync(path.join(ROOT, relativePath)));
}

function bundleHash(relativePaths) {
  const hash = createHash("sha256");
  for (const relativePath of [...relativePaths].sort()) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
}

export function stableJson(value, spaces = 0) {
  return JSON.stringify(sorted(value), null, spaces);
}

export function currentMetadata() {
  const manifest = buildCatalogManifest();
  const snapshot = buildAdaptiveTurnSnapshot({ subjectBrief: "原创游侠角色", history: [], precision: "simple" });
  return {
    productionHash: bundleHash(PRODUCTION_FILES),
    contractHash: fileHash(".research/deepseek-turn-contract-2026-07-15.md"),
    fixtureHash: fileHash(".research/adaptive-question-quality.fixtures.json"),
    routingPromptHash: fileHash(".research/adaptive-question-system-v1.md"),
    judgePromptHash: fileHash(".research/adaptive-question-judge-v1.md"),
    runtimePromptHash: sha256(buildAdaptiveProviderBody(snapshot).messages[0].content),
    catalogHash: sha256(stableJson(manifest)),
    contractVersion: snapshot.contractVersion,
    routingPromptVersion: "adaptive-question-system-v1",
    judgePromptVersion: "adaptive-question-judge-v1",
  };
}

export function repositoryCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

export function evaluatorHash() {
  return bundleHash(EVALUATOR_FILES);
}

export function productionDirtyPaths() {
  const output = execFileSync("git", ["status", "--porcelain", "--", ...PRODUCTION_FILES], { cwd: ROOT, encoding: "utf8" }).trim();
  return output ? output.split("\n").sort() : [];
}

export function readCorpus(inputPath) {
  const text = fs.readFileSync(inputPath, "utf8");
  const records = text.trimEnd().split("\n").filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error(`invalid_corpus_json:${index + 1}`); }
  });
  if (!records.length) throw new Error("empty_corpus");
  return { records, bytes: Buffer.from(text, "utf8") };
}

export function compare(expected, actual, prefix = "") {
  if (stableJson(expected) === stableJson(actual)) return [];
  if (!expected || !actual || typeof expected !== "object" || typeof actual !== "object") return [prefix || "$"];
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  return keys.flatMap((key) => compare(expected[key], actual[key], prefix ? `${prefix}.${key}` : key));
}

const SAFE_FINISH_REASONS = new Set([
  "tool_calls", "length", "content_filter", "insufficient_system_resource", "stop",
]);
const SAFE_FAILURE_CODES = new Set([
  "request_too_large", "response_too_large", "invalid_json", "finish_reason", "tool_envelope",
  "tool_arguments", "tool_arguments_invalid_json", "schema", "completion_shape",
  "premature_completion", "ask_shape", "ask_budget_exceeded", "ask_text",
  "option_shape", "option_cardinality", "ineligible_dimension", "option_allowlist",
  "network_error", "adaptive_turn_timeout", "provider_cancelled", "no_safe_adaptive_turn",
  "history_budget_exhausted", "adaptive_route_invalid_payload", "adaptive_route_failed",
  "adaptive_browser_option_cardinality", "adaptive_browser_dimension_missing",
  "adaptive_browser_option_missing",
]);

function diagnosticFinishReason(value) {
  if (value == null) return null;
  return SAFE_FINISH_REASONS.has(value) ? value : "other";
}

function diagnosticFailureCode(value) {
  if (typeof value !== "string") return null;
  if (SAFE_FAILURE_CODES.has(value) || /^http_[1-5][0-9]{2}$/.test(value)) return value;
  return "other";
}

function provenanceId(value) {
  if (typeof value !== "string") return null;
  return /^[a-z0-9][a-z0-9._:-]{0,127}$/.test(value) ? value : sha256(value);
}

function contentFreeObservation(item) {
  const raw = item.raw ?? {};
  const recording = raw.recording ?? {};
  const evidence = raw.evidence ?? {};
  const recordedBody = recording.kind === "http" && typeof recording.bodyBase64 === "string"
    ? Buffer.from(recording.bodyBase64, "base64")
    : undefined;
  const recordedBodyDigest = digestBytes(recordedBody);
  const evidenceBodyDigest = digestBytes(evidence.rawBody);
  const recordedToolArgumentsDigest = digestValue(recording.toolArgumentsRaw);
  const evidenceToolArgumentsDigest = digestValue(evidence.toolArgumentsRaw);
  const pinned = item.pinned ?? {};
  const hashKeys = new Set([
    "productionHash", "contractHash", "fixtureHash", "routingPromptHash", "judgePromptHash",
    "runtimePromptHash", "catalogHash",
  ]);
  const safePinned = Object.fromEntries([
    "productionHash", "contractHash", "fixtureHash", "routingPromptHash", "judgePromptHash",
    "runtimePromptHash", "catalogHash", "contractVersion", "routingPromptVersion", "judgePromptVersion",
  ].flatMap((key) => {
    const value = pinned[key];
    const valid = typeof value === "string" && (hashKeys.has(key)
      ? /^sha256:[0-9a-f]{64}$/.test(value)
      : /^[a-z0-9][a-z0-9.-]{0,79}$/.test(value));
    return valid ? [[key, value]] : [];
  }));
  const safeDiff = Array.isArray(item.outcome?.diff)
    ? item.outcome.diff.map((entry) => typeof entry === "string" && /^(?:routeStatus|normalized\.(?:action|source|reason|questionId|optionIds(?:\.\d+)?)|ui\.(?:action|code|status|questionId|optionIds(?:\.\d+)?|freeTextAvailable)|hardFailureCodes(?:\.\d+)?)$/.test(entry) ? entry : "$unexpected")
    : [];
  const normalized = {
    action: ["ask", "completion", "error"].includes(item.normalized?.action) ? item.normalized.action : "other",
    source: ["model", "fallback", "remainingEmpty", "route"].includes(item.normalized?.source)
      ? item.normalized.source : "other",
    reason: diagnosticFailureCode(item.normalized?.reason),
    questionId: provenanceId(item.normalized?.questionId),
    optionIds: Array.isArray(item.normalized?.optionIds)
      ? item.normalized.optionIds.map(provenanceId).filter(Boolean) : [],
  };
  const ui = {
    action: ["ask", "completion", "error"].includes(item.ui?.action) ? item.ui.action : "other",
    code: diagnosticFailureCode(item.ui?.code),
    status: Number.isSafeInteger(item.ui?.status) ? item.ui.status : null,
    questionId: provenanceId(item.ui?.questionId),
    optionIds: Array.isArray(item.ui?.optionIds)
      ? item.ui.optionIds.map(provenanceId).filter(Boolean) : [],
    freeTextAvailable: item.ui?.freeTextAvailable === true,
  };
  return {
    schemaVersion: ARTIFACT_VERSION,
    caseId: provenanceId(item.caseId),
    ...(Array.isArray(item.covers) ? { covers: item.covers.filter((branch) => REQUIRED_BRANCHES.includes(branch)) } : {}),
    ...(provenanceId(item.fixtureId) ? { fixtureId: provenanceId(item.fixtureId) } : {}),
    ...(Number.isSafeInteger(item.repetition) ? { repetition: item.repetition } : {}),
    ...(Object.keys(safePinned).length ? { pinned: safePinned } : {}),
    raw: {
      recording: {
        kind: ["http", "network", "none"].includes(recording.kind) ? recording.kind : "other",
        status: Number.isSafeInteger(recording.status) ? recording.status : null,
        responseBytes: recordedBodyDigest.bytes,
        responseHash: recordedBodyDigest.hash,
        finishReason: diagnosticFinishReason(recording.finishReason),
        toolArgumentsBytes: recordedToolArgumentsDigest.bytes,
        toolArgumentsHash: recordedToolArgumentsDigest.hash,
      },
      routeStatus: Number.isSafeInteger(raw.routeStatus) ? raw.routeStatus : null,
      requestBytes: Number.isSafeInteger(raw.requestBytes) ? raw.requestBytes : null,
      exchangeCalls: Number.isSafeInteger(raw.exchangeCalls) ? raw.exchangeCalls : 0,
      evidence: {
        providerStatus: Number.isSafeInteger(evidence.providerStatus) ? evidence.providerStatus : null,
        responseBytes: evidenceBodyDigest.bytes,
        responseHash: evidenceBodyDigest.hash,
        finishReason: diagnosticFinishReason(evidence.finishReason),
        toolArgumentsBytes: evidenceToolArgumentsDigest.bytes,
        toolArgumentsHash: evidenceToolArgumentsDigest.hash,
        failureCode: diagnosticFailureCode(evidence.failureCode),
      },
    },
    normalized,
    ui,
    judge: {
      status: item.judge?.status === "skipped" ? "skipped" : "other",
      providerCalls: Number.isSafeInteger(item.judge?.providerCalls) ? item.judge.providerCalls : 0,
    },
    outcome: {
      pass: item.outcome?.pass === true,
      diff: safeDiff,
      rawEvidenceMatches: item.outcome?.rawEvidenceMatches === true,
      toolArgumentsMatch: item.outcome?.toolArgumentsMatch === true,
      acceptedAsModel: item.outcome?.acceptedAsModel === true,
      violationRendered: item.outcome?.violationRendered === true,
    },
    actual: {
      routeStatus: Number.isSafeInteger(item.actual?.routeStatus) ? item.actual.routeStatus : null,
      normalized,
      ui,
      hardFailureCodes: Array.isArray(item.actual?.hardFailureCodes)
        ? item.actual.hardFailureCodes.map(diagnosticFailureCode) : [],
    },
  };
}

export function writeArtifacts(outDir, config, observations, summary) {
  fs.mkdirSync(outDir, { recursive: true });
  const safeObservations = observations.map(contentFreeObservation);
  const safeSummary = {
    ...summary,
    invalidBranchClaims: Array.isArray(summary.invalidBranchClaims)
      ? summary.invalidBranchClaims.map(provenanceId).filter(Boolean) : [],
    missingBranches: Array.isArray(summary.missingBranches)
      ? summary.missingBranches.filter((branch) => REQUIRED_BRANCHES.includes(branch)) : [],
  };
  const report = [
    "# Adaptive Replay Gate", "", `- Result: **${safeSummary.pass ? "PASS" : "FAIL"}**`,
    `- Cases: ${safeSummary.passedCases}/${safeSummary.totalCases}`, `- Mismatches: ${safeSummary.mismatches}`,
    `- Undetected violations: ${safeSummary.undetectedViolations}`,
    `- Invalid branch claims: ${safeSummary.invalidBranchClaims.length ? safeSummary.invalidBranchClaims.join(", ") : "none"}`,
    `- Missing branches: ${safeSummary.missingBranches.length ? safeSummary.missingBranches.join(", ") : "none"}`,
    "", "## Cases", "",
    ...safeObservations.map((item) => `- ${item.outcome.pass ? "PASS" : "FAIL"} \`${item.caseId}\`${item.outcome.diff.length ? ` — ${item.outcome.diff.join(", ")}` : ""}`), "",
  ].join("\n");
  const files = {
    "run-config.json": `${stableJson(config, 2)}\n`,
    "observations.jsonl": safeObservations.map((item) => stableJson(item)).join("\n") + (safeObservations.length ? "\n" : ""),
    "summary.json": `${stableJson(safeSummary, 2)}\n`,
    "report.md": report,
  };
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(outDir, name), content);
  const hashes = Object.fromEntries(Object.entries(files).map(([name, content]) => [name, sha256(content)]));
  fs.writeFileSync(path.join(outDir, "bundle-sha256.json"), `${stableJson(hashes, 2)}\n`);
}

export function parseArgs(argv) {
  const value = (name) => {
    const index = argv.indexOf(`--${name}`);
    if (index < 0 || index + 1 >= argv.length || argv[index + 1].startsWith("--")) return undefined;
    return argv[index + 1];
  };
  return { mode: value("mode"), input: value("input"), out: value("out") };
}
