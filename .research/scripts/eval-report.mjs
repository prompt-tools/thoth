#!/usr/bin/env tsx
/**
 * Aggregate eval runs.jsonl → summary.json + report.md.
 *
 * Usage:
 *   tsx .research/scripts/eval-report.mjs .research/out/eval/<stamp>
 *   npm run eval:report -- .research/out/eval/<stamp>
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "runs.jsonl"))) {
  console.error("Usage: node .research/scripts/eval-report.mjs <eval-output-dir>");
  process.exit(1);
}

const configPath = path.join(dir, "config.json");
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

const runs = fs.readFileSync(path.join(dir, "runs.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);

// ── metrics ──────────────────────────────────────────────────────────────
const totalRuns = runs.length;
const allTurns = runs.flatMap((r) => r.turns || []);
const totalTurns = allTurns.length;

// per-dimension stats
const dimAsked = {};
const dimInvalidId = {};
const dimConflict = {};
for (const t of allTurns) {
  if (t.nextQuestionId) {
    dimAsked[t.nextQuestionId] = (dimAsked[t.nextQuestionId] || 0) + 1;
  }
  if (t.droppedInvalidOptionIds?.length) {
    // attribute to the dimension that was asked
    const dim = t.nextQuestionId || "unknown";
    dimInvalidId[dim] = (dimInvalidId[dim] || 0) + t.droppedInvalidOptionIds.length;
  }
  if (t.conflictDropped?.length) {
    const dim = t.nextQuestionId || "unknown";
    dimConflict[dim] = (dimConflict[dim] || 0) + t.conflictDropped.length;
  }
}

const repeatedCount = allTurns.filter((t) => t.repeatedDimension).length;
const tierJumpCount = allTurns.filter((t) => t.attemptedTierJump).length;
const emptyShownCount = allTurns.filter((t) => t.shownOptionIds?.length === 0 && t.answer?.kind !== "done").length;

// New diagnostics-based metrics (from runAgentTurn)
const turnDiagnostics = allTurns.filter((t) => t.diagnostics);
const outOfPoolCount = turnDiagnostics.filter((t) => t.diagnostics.outOfPool).length;
const correctedCount = turnDiagnostics.filter((t) => t.diagnostics.corrected).length;
const turnFallbackCount = turnDiagnostics.filter((t) => t.diagnostics.fallbackUsed).length;

// termination reasons
const termReasons = {};
for (const r of runs) {
  termReasons[r.terminationReason] = (termReasons[r.terminationReason] || 0) + 1;
}

// selfDoneRate = done / (done + noRemaining + maxTurns) — only real model "done", not forcedDone
const doneCount = termReasons["done"] || 0;
const noRemainingCount = termReasons["noRemaining"] || 0;
const maxTurnsCount = termReasons["maxTurns"] || 0;
const doneEmptyCount = termReasons["done_empty"] || 0;
const forcedDoneCount = termReasons["forcedDone"] || 0;
const selfDoneRate = doneCount / Math.max(1, doneCount + noRemainingCount + maxTurnsCount);

// Slim-prompt sentinel: done/forcedDone runs should have askedDimensions.length >= 5
const doneOrForcedRuns = runs.filter((r) => r.terminationReason === "done" || r.terminationReason === "forcedDone");
const thinPromptRuns = doneOrForcedRuns.filter((r) => (r.askedDimensions?.length ?? 0) < 5);

const errorRuns = runs.filter((r) => r.terminationReason === "error");
const errorRate = errorRuns.length / Math.max(1, totalRuns);

const fallbackGiveUpCount = termReasons["fallbackGiveUp"] || 0;

const emptyPromptRuns = runs.filter((r) => r.finalPrompt?.zhEmpty && r.finalPrompt?.enEmpty);

// turn count distribution
const turnCounts = runs.map((r) => r.turnCount).sort((a, b) => a - b);
const p = (arr, q) => arr[Math.floor(arr.length * q)] ?? 0;
const turnDist = { min: turnCounts[0] ?? 0, p50: p(turnCounts, 0.5), p90: p(turnCounts, 0.9), max: turnCounts[turnCounts.length - 1] ?? 0 };

// latency
const latencies = allTurns.filter((t) => t.latencyMs > 0).map((t) => t.latencyMs);
const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

// per-primaryType turn distribution
const runsByType = {};
for (const r of runs) {
  const t = r.primaryType || "unknown";
  if (!runsByType[t]) runsByType[t] = [];
  runsByType[t].push(r.turnCount);
}
const turnDistByType = {};
for (const [t, counts] of Object.entries(runsByType)) {
  const sorted = counts.sort((a, b) => a - b);
  turnDistByType[t] = { count: sorted.length, min: sorted[0] ?? 0, p50: p(sorted, 0.5), p90: p(sorted, 0.9), max: sorted[sorted.length - 1] ?? 0 };
}

// precision from config.json or first run
const precision = config.precision || runs[0]?.precision || "unknown";

// A6: auto-fill metrics
const finalDimCounts = runs.map((r) => r.finalDimCount ?? (r.askedDimensions?.length ?? 0));
const avgFinalDimCount = finalDimCounts.length > 0
  ? +(finalDimCounts.reduce((a, b) => a + b, 0) / finalDimCounts.length).toFixed(2)
  : 0;
const autoFilledCounts = runs.map((r) => (r.autoFilledDimensions?.length ?? 0));
const avgAutoFilled = autoFilledCounts.length > 0
  ? +(autoFilledCounts.reduce((a, b) => a + b, 0) / autoFilledCounts.length).toFixed(2)
  : 0;
const autoFillUsedRuns = runs.filter((r) => (r.autoFilledDimensions?.length ?? 0) > 0).length;

// dimensions never asked
const allDimIds = new Set();
for (const r of runs) {
  for (const t of r.turns || []) {
    for (const id of t.offeredDimensionIds || []) allDimIds.add(id);
  }
}
const neverAsked = [...allDimIds].filter((id) => !dimAsked[id]);

// ── worst examples ──────────────────────────────────────────────────────
function worstExamples(runs, field, max = 3) {
  return runs
    .filter((r) => {
      if (field === "error") return r.terminationReason === "error";
      if (field === "maxTurns") return r.terminationReason === "maxTurns";
      if (field === "done_empty") return r.terminationReason === "done_empty";
      if (field === "emptyPrompt") return r.finalPrompt?.zhEmpty && r.finalPrompt?.enEmpty;
      if (field === "invalidId") return (r.turns || []).some((t) => t.droppedInvalidOptionIds?.length > 0);
      return false;
    })
    .slice(0, max)
    .map((r) => ({
      runId: r.runId,
      seed: r.seed,
      description: r.description,
      turnCount: r.turnCount,
      terminationReason: r.terminationReason,
      errorCount: r.errorCount,
    }));
}

const worst = {
  error: worstExamples(runs, "error"),
  maxTurns: worstExamples(runs, "maxTurns"),
  done_empty: worstExamples(runs, "done_empty"),
  emptyPrompt: worstExamples(runs, "emptyPrompt"),
  invalidId: worstExamples(runs, "invalidId"),
};

// ── summary ──────────────────────────────────────────────────────────────
const summary = {
  totalRuns,
  totalTurns,
  terminationReasons: termReasons,
  selfDoneRate: +selfDoneRate.toFixed(3),
  noRemainingRate: +(noRemainingCount / Math.max(1, totalRuns)).toFixed(3),
  doneEmptyRate: +(doneEmptyCount / Math.max(1, totalRuns)).toFixed(3),
  errorRate: +errorRate.toFixed(3),
  finalPromptEmptyRate: +(emptyPromptRuns.length / Math.max(1, totalRuns)).toFixed(3),
  repeatedDimensionRate: +(repeatedCount / Math.max(1, totalTurns)).toFixed(4),
  attemptedTierJumpRate: +(tierJumpCount / Math.max(1, totalTurns)).toFixed(4),
  emptyShownStepRate: +(emptyShownCount / Math.max(1, totalTurns)).toFixed(4),
  hardConflictDroppedCount: Object.values(dimConflict).reduce((a, b) => a + b, 0),
  invalidOptionIdRate: totalTurns > 0 ? +(Object.values(dimInvalidId).reduce((a, b) => a + b, 0) / totalTurns).toFixed(4) : 0,
  invalidOptionIdByDim: dimInvalidId,
  outOfPoolRate: turnDiagnostics.length > 0 ? +(outOfPoolCount / turnDiagnostics.length).toFixed(4) : 0,
  correctedRate: turnDiagnostics.length > 0 ? +(correctedCount / turnDiagnostics.length).toFixed(4) : 0,
  fallbackRate: turnDiagnostics.length > 0 ? +(turnFallbackCount / turnDiagnostics.length).toFixed(4) : 0,
  fallbackGiveUpRate: +(fallbackGiveUpCount / Math.max(1, totalRuns)).toFixed(3),
  forcedDoneRate: +(forcedDoneCount / Math.max(1, totalRuns)).toFixed(3),
  thinPromptCount: thinPromptRuns.length,
  precision,
  turnDistByType,
  turnCountDistribution: turnDist,
  avgLatencyMs: avgLatency,
  dimensionAskFrequency: dimAsked,
  dimensionsNeverAsked: neverAsked,
  avgFinalDimCount,
  avgAutoFilledDimensions: avgAutoFilled,
  autoFillUsedRate: +(autoFillUsedRuns / Math.max(1, totalRuns)).toFixed(3),
  worst,
};

fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

// ── report.md ────────────────────────────────────────────────────────────
const md = [];
md.push("# Eval Report\n");
md.push(`Runs: ${totalRuns} | Turns: ${totalTurns} | Provider: ${runs[0]?.provider ?? "?"} | Model: ${runs[0]?.routingModel ?? "?"} | Precision: ${precision}\n`);
md.push(`Catalog: ${runs[0]?.catalogVersion ?? "?"}\n`);
md.push("## Termination Reasons\n");
md.push("| Reason | Count | Rate |");
md.push("|--------|-------|------|");
for (const [k, v] of Object.entries(termReasons).sort((a, b) => b[1] - a[1])) {
  md.push(`| ${k} | ${v} | ${(v / totalRuns).toFixed(3)} |`);
}

md.push("\n## Key Metrics\n");
md.push(`- **selfDoneRate** (model主动收尾): ${summary.selfDoneRate}`);
md.push(`- **noRemainingRate** (维度问完被动收尾): ${summary.noRemainingRate}`);
md.push(`- **doneEmptyRate** (开局就bail): ${summary.doneEmptyRate}`);
md.push(`- **errorRate**: ${summary.errorRate}`);
md.push(`- **finalPromptEmptyRate**: ${summary.finalPromptEmptyRate}`);
md.push(`- **repeatedDimensionRate**: ${summary.repeatedDimensionRate}`);
md.push(`- **attemptedTierJumpRate**: ${summary.attemptedTierJumpRate}`);
md.push(`- **emptyShownStepRate**: ${summary.emptyShownStepRate}`);
md.push(`- **hardConflictDroppedCount**: ${summary.hardConflictDroppedCount}`);
md.push(`- **invalidOptionIdRate**: ${summary.invalidOptionIdRate}`);
md.push(`- **outOfPoolRate** (attempt-0 真实缺陷率): ${summary.outOfPoolRate}`);
md.push(`- **correctedRate** (重试救回率): ${summary.correctedRate}`);
md.push(`- **fallbackRate** (轮级兜底率): ${summary.fallbackRate}`);
md.push(`- **fallbackGiveUpRate** (连续兜底放弃率): ${summary.fallbackGiveUpRate}`);
md.push(`- **forcedDoneRate** (确定性兜底收尾): ${summary.forcedDoneRate}`);
md.push(`- **thinPromptCount** (done/forcedDone但轮数<5的哨兵): ${summary.thinPromptCount}`);
md.push(`- **avgLatencyMs**: ${avgLatency}`);
md.push(`- **avgFinalDimCount** (asked + auto-filled per run): ${avgFinalDimCount}`);
md.push(`- **avgAutoFilledDimensions** (avg dims auto-filled per run): ${avgAutoFilled}`);
md.push(`- **autoFillUsedRate** (runs where auto-fill kicked in): ${summary.autoFillUsedRate}`);

md.push("\n## Turn Count Distribution\n");
md.push(`min=${turnDist.min} p50=${turnDist.p50} p90=${turnDist.p90} max=${turnDist.max}`);

md.push("\n## Turn Count by Primary Type\n");
if (Object.keys(turnDistByType).length === 0) {
  md.push("_none_");
} else {
  md.push("| Type | Runs | min | p50 | p90 | max |");
  md.push("|------|------|-----|-----|-----|-----|");
  for (const [t, d] of Object.entries(turnDistByType).sort((a, b) => b[1].count - a[1].count)) {
    md.push(`| ${t} | ${d.count} | ${d.min} | ${d.p50} | ${d.p90} | ${d.max} |`);
  }
}

md.push("\n## Invalid Option IDs by Dimension\n");
if (Object.keys(dimInvalidId).length === 0) {
  md.push("_none_");
} else {
  md.push("| Dimension | Count |");
  md.push("|-----------|-------|");
  for (const [k, v] of Object.entries(dimInvalidId).sort((a, b) => b[1] - a[1])) {
    md.push(`| ${k} | ${v} |`);
  }
}

md.push("\n## Dimension Ask Frequency\n");
md.push("| Dimension | Asked |");
md.push("|-----------|-------|");
for (const [k, v] of Object.entries(dimAsked).sort((a, b) => b[1] - a[1])) {
  md.push(`| ${k} | ${v} |`);
}
if (neverAsked.length > 0) {
  md.push(`\n**Never asked:** ${neverAsked.join(", ")}`);
}

md.push("\n## Worst Examples\n");
for (const [category, examples] of Object.entries(worst)) {
  if (examples.length === 0) continue;
  md.push(`### ${category}`);
  for (const ex of examples) {
    md.push(`- seed=${ex.seed} "${ex.description}" turns=${ex.turnCount} reason=${ex.terminationReason} errors=${ex.errorCount}`);
  }
}

fs.writeFileSync(path.join(dir, "report.md"), md.join("\n"), "utf8");
console.log(`summary.json + report.md written to ${dir}`);
