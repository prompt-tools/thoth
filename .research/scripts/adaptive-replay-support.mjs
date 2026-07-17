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
export const ARTIFACT_VERSION = "adaptive-replay-artifact-v1";
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

export function writeArtifacts(outDir, config, observations, summary) {
  fs.mkdirSync(outDir, { recursive: true });
  const report = [
    "# Adaptive Replay Gate", "", `- Result: **${summary.pass ? "PASS" : "FAIL"}**`,
    `- Cases: ${summary.passedCases}/${summary.totalCases}`, `- Mismatches: ${summary.mismatches}`,
    `- Undetected violations: ${summary.undetectedViolations}`,
    `- Invalid branch claims: ${summary.invalidBranchClaims.length ? summary.invalidBranchClaims.join(", ") : "none"}`,
    `- Missing branches: ${summary.missingBranches.length ? summary.missingBranches.join(", ") : "none"}`,
    "", "## Cases", "",
    ...observations.map((item) => `- ${item.outcome.pass ? "PASS" : "FAIL"} \`${item.caseId}\`${item.outcome.diff.length ? ` — ${item.outcome.diff.join(", ")}` : ""}`), "",
  ].join("\n");
  const files = {
    "run-config.json": `${stableJson(config, 2)}\n`,
    "observations.jsonl": observations.map((item) => stableJson(item)).join("\n") + (observations.length ? "\n" : ""),
    "summary.json": `${stableJson(summary, 2)}\n`,
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
