#!/usr/bin/env tsx
/**
 * Extract portrait prompts from corpus; write stats JSON (three-column eval metrics).
 * Does NOT overwrite PORTRAIT-STRUCTURE-PLAN.md (canonical v3 is hand-maintained).
 *
 * Usage:
 *   npm run structure-plan -- /path/to/corpus.csv
 *   npm run structure-plan -- /path/to/corpus.csv --eval-simple .research/out/eval/... --eval-detailed .research/out/eval/...
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadCorpusTexts } from "./corpus-load.mjs";
import { SECTIONS, pct, aggregateEvalSectionMetrics } from "./eval-section-metrics.mjs";

const root = path.resolve(import.meta.dirname, "../..");

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const corpusPath =
  process.argv.find((a) => !a.startsWith("--") && /\.(csv|jsonl|txt)$/i.test(a)) ??
  "/Users/klaus/Downloads/nano-banana-pro-prompts-20260619.csv";

const evalSimple = flag(
  "eval-simple",
  ".research/out/eval/2026-06-18T16-37-15__deepseek-deepseek-chat__portrait-simple-v2",
);
const evalDetailed = flag(
  "eval-detailed",
  ".research/out/eval/2026-06-18T16-42-55__deepseek-deepseek-chat__portrait-detailed-v3",
);

const outDir = path.join(root, ".research/out");
const portraitJsonl = path.join(outDir, "portrait-prompts-20260619.jsonl");
const statsPath = path.join(outDir, "portrait-structure-stats.json");

async function loadTs(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

const { analyzePortraitPrompts, detectPortraitSections, isPortraitPrompt } = await loadTs(
  "src/lib/prompt/agent/portrait-prompt-analysis.ts",
);

function tier(rate) {
  if (rate >= 80) return "A-核心";
  if (rate >= 60) return "B-常现";
  if (rate >= 40) return "C-可选";
  return "D-长尾";
}

function loadEvalMetrics(evalDir) {
  const runsPath = path.join(root, evalDir, "runs.jsonl");
  if (!fs.existsSync(runsPath)) return null;
  const runs = fs.readFileSync(runsPath, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  const m = aggregateEvalSectionMetrics(runs, detectPortraitSections);
  return {
    evalDir,
    precision: runs[0]?.precision ?? "?",
    ...m,
    avgDims: Math.round((runs.reduce((a, r) => a + (r.finalDimCount ?? 0), 0) / Math.max(1, m.evalN)) * 10) / 10,
  };
}

const allTexts = loadCorpusTexts(corpusPath);
const portraitTexts = allTexts.filter((t) => isPortraitPrompt(t));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  portraitJsonl,
  portraitTexts.map((content) => JSON.stringify({ content })).join("\n") + "\n",
);

const analysis = analyzePortraitPrompts(portraitTexts, 25);
const n = portraitTexts.length;
const sectionRates = Object.fromEntries(
  SECTIONS.map((s) => [s, pct(analysis.sectionCounts[s], n)]),
);

let sectionSum = 0;
const sectionHist = {};
for (const text of portraitTexts) {
  const count = detectPortraitSections(text).size;
  sectionSum += count;
  sectionHist[count] = (sectionHist[count] ?? 0) + 1;
}

const tiers = SECTIONS.map((s) => ({
  section: s,
  rate: sectionRates[s],
  tier: tier(sectionRates[s]),
  count: analysis.sectionCounts[s],
})).sort((a, b) => b.rate - a.rate);

const simpleEval = loadEvalMetrics(evalSimple);
const detailedEval = loadEvalMetrics(evalDetailed);

const stats = {
  generatedAt: new Date().toISOString(),
  metricsVersion: 2,
  corpusPath,
  extractedPortraitJsonl: portraitJsonl,
  planDocCanonical: ".research/out/PORTRAIT-STRUCTURE-PLAN.md",
  totalRows: allTexts.length,
  portraitRows: n,
  nonPortraitRows: allTexts.length - n,
  portraitRate: pct(n, allTexts.length),
  avgSectionsPerPortrait: Math.round((sectionSum / n) * 10) / 10,
  sectionHistogram: sectionHist,
  sectionRates,
  tiers,
  topTokens: analysis.topTokens,
  evalSimple,
  evalDetailed,
};

fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2) + "\n");

console.log(JSON.stringify({
  portraitJsonl,
  statsPath,
  portraitRows: n,
  evalSimple: simpleEval
    ? { runs: simpleEval.evalN, faceQ: simpleEval.sectionRatesQuestionnaire.face, poseA: simpleEval.sectionRatesAutofill.pose }
    : null,
  evalDetailed: detailedEval
    ? { runs: detailedEval.evalN, interactionPath: detailedEval.sectionRatesPath.interaction }
    : null,
}, null, 2));
