#!/usr/bin/env tsx
/**
 * Compare eval dimension coverage vs portrait corpus (three-column metrics).
 *
 * Usage:
 *   npm run compare-corpus -- .research/out/eval/<stamp> [/path/to/corpus.csv|jsonl]
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadCorpusTexts } from "./corpus-load.mjs";
import {
  SECTIONS,
  DIM_TO_SECTION,
  pct,
  aggregateEvalSectionMetrics,
} from "./eval-section-metrics.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const evalDir = process.argv[2];
const corpusPath =
  process.argv[3] ??
  "/Users/klaus/Downloads/nano-banana-pro-prompts-20260619.csv";

if (!evalDir || !fs.existsSync(path.join(evalDir, "runs.jsonl"))) {
  console.error("Usage: npm run compare-corpus -- <eval-output-dir> [corpus.csv|jsonl]");
  process.exit(1);
}
if (!fs.existsSync(corpusPath)) {
  console.error(`Corpus not found: ${corpusPath}`);
  process.exit(1);
}

async function loadTs(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

const { analyzePortraitPrompts, detectPortraitSections, isPortraitPrompt } = await loadTs(
  "src/lib/prompt/agent/portrait-prompt-analysis.ts",
);

function sectionRatesFromTexts(texts) {
  const counts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  let n = 0;
  for (const text of texts) {
    const sections = detectPortraitSections(text);
    if (sections.size === 0) continue;
    n += 1;
    for (const s of sections) counts[s] += 1;
  }
  return { n, counts, rates: Object.fromEntries(SECTIONS.map((s) => [s, pct(counts[s], n)])) };
}

const corpusTexts = loadCorpusTexts(corpusPath);
const corpusPortraitTexts = corpusTexts.filter((t) => isPortraitPrompt(t));
const corpusPortrait = analyzePortraitPrompts(corpusPortraitTexts, 30);
const corpusPortraitSections = sectionRatesFromTexts(corpusPortraitTexts);

const runs = fs
  .readFileSync(path.join(evalDir, "runs.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);

const metrics = aggregateEvalSectionMetrics(runs, detectPortraitSections);

const deviations = (evalRates, label) =>
  SECTIONS.map((s) => ({
    section: s,
    corpusRate: corpusPortraitSections.rates[s],
    evalRate: evalRates[s],
    delta: Math.round((evalRates[s] - corpusPortraitSections.rates[s]) * 10) / 10,
    metric: label,
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

const devQuestionnaire = deviations(metrics.sectionRatesQuestionnaire, "questionnaire");
const devAutofill = deviations(metrics.sectionRatesAutofill, "autofill");
const devPath = deviations(metrics.sectionRatesPath, "path");

const report = {
  evalDir,
  corpusPath,
  metricsVersion: 2,
  corpus: {
    totalRows: corpusTexts.length,
    portraitRows: corpusPortraitTexts.length,
    portraitRate: pct(corpusPortraitTexts.length, corpusTexts.length),
    sectionRates: corpusPortraitSections.rates,
    topTokens: corpusPortrait.topTokens.slice(0, 20),
  },
  eval: {
    totalRuns: runs.length,
    successfulRuns: metrics.evalN,
    runsWithFinalPrompt: metrics.promptN,
    earlyStopCount: metrics.earlyStopCount,
    precision: runs[0]?.precision ?? null,
    avgFinalDimCount:
      Math.round((runs.reduce((a, r) => a + (r.finalDimCount ?? 0), 0) / Math.max(1, metrics.evalN)) * 10) / 10,
    sectionRatesQuestionnaire: metrics.sectionRatesQuestionnaire,
    sectionRatesAutofill: metrics.sectionRatesAutofill,
    sectionRatesPath: metrics.sectionRatesPath,
    sectionRatesFinalPrompt: metrics.sectionRatesFinalPrompt,
    dimQuestionnaireRates: metrics.dimQuestionnaireRates,
    dimAutofillRates: metrics.dimAutofillRates,
    /** @deprecated use sectionRatesPath */
    sectionRatesFromDims: metrics.sectionRatesPath,
    sectionRatesFromFinalPrompt: metrics.sectionRatesFinalPrompt,
  },
  deviation: {
    questionnaire: devQuestionnaire,
    autofill: devAutofill,
    path: devPath,
  },
};

const notes = [];
const q = metrics.sectionRatesQuestionnaire;
const a = metrics.sectionRatesAutofill;
const corpus = corpusPortraitSections.rates;
if (corpus.hair > a.hair + 20 && q.hair < 10) {
  notes.push("hair：语料高、问卷低；优先调 autofill order/cap（P0-1）。");
}
if (corpus.pose > a.pose + 20 && q.pose < 5) {
  notes.push("pose：autofill 0%；order 中 pose 靠后 + cap 挤掉（P0-1/4）。");
}
if (corpus.lighting > a.lighting + 20 && q.lighting < 10) {
  notes.push("lighting：主要靠 autofill，问卷未覆盖（P0-1）。");
}
if (metrics.sectionRatesPath.interaction > corpus.interaction + 30) {
  notes.push("interaction 路径覆盖远高于语料；收窄 scope（P1-6）。");
}
report.interpretation = { notes };

const outPath = path.join(evalDir, "corpus-compare.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Wrote ${outPath}\n`);
console.log(`Corpus: ${corpusPortraitTexts.length}/${corpusTexts.length} portrait (${report.corpus.portraitRate}%)`);
console.log(`Eval: ${metrics.evalN} runs, earlyStop=${metrics.earlyStopCount}, avg ${report.eval.avgFinalDimCount} dims\n`);
console.log("Section rates (corpus % | questionnaire % | autofill % | finalPrompt %):");
for (const s of SECTIONS) {
  const fp = metrics.sectionRatesFinalPrompt[s];
  console.log(
    `  ${s.padEnd(12)} corpus ${String(corpus[s]).padStart(5)}%  Q ${String(q[s]).padStart(5)}%  A ${String(a[s]).padStart(5)}%  FP ${String(fp).padStart(5)}%`,
  );
}
if (notes.length) {
  console.log("\nNotes:");
  for (const n of notes) console.log(`  - ${n}`);
}
