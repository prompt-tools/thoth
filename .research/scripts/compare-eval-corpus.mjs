#!/usr/bin/env tsx
/**
 * Compare eval dimension coverage vs the 13k portrait corpus.
 *
 * Usage:
 *   npm run compare-corpus -- .research/out/eval/<stamp> [/path/to/prompts.jsonl]
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const evalDir = process.argv[2];
const corpusPath =
  process.argv[3] ??
  "/Users/klaus/Projects/controllable-image-prompt-guide/.research/out/nano-banana-pro-prompts-20260526/prompts.jsonl";

if (!evalDir || !fs.existsSync(path.join(evalDir, "runs.jsonl"))) {
  console.error("Usage: npm run compare-corpus -- <eval-output-dir> [corpus.jsonl]");
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
  "src/lib/prompt/agent/portrait-prompt-analysis.ts"
);

const SECTIONS = [
  "subject",
  "identity",
  "face",
  "hair",
  "outfit",
  "pose",
  "interaction",
  "scene",
  "camera",
  "lighting",
  "style",
  "quality",
  "negative",
];

const DIM_TO_SECTION = {
  subject: "subject",
  person_type: "subject",
  gender_presentation: "identity",
  age_band: "identity",
  skin_tone: "identity",
  body_type: "pose",
  face_features: "face",
  hair: "hair",
  makeup: "hair",
  outfit: "outfit",
  pose: "pose",
  character_interaction: "interaction",
  character_props: "interaction",
  scene: "scene",
  framing: "camera",
  camera: "camera",
  camera_angle: "camera",
  aspect_ratio: "camera",
  composition: "quality",
  lighting: "lighting",
  art_style: "style",
  color_palette: "style",
  mood: "style",
  character_render_style: "style",
  character_archetype: "style",
  detail_level: "quality",
  post_processing: "quality",
  use_case: "quality",
  constraints: "negative",
  portrait_expression: "face",
};

function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function sectionRatesFromTexts(texts) {
  const counts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  let n = 0;
  for (const text of texts) {
    const sections = detectPortraitSections(text);
    if (sections.size === 0) continue;
    n += 1;
    for (const s of sections) counts[s] += 1;
  }
  const rates = Object.fromEntries(SECTIONS.map((s) => [s, pct(counts[s], n)]));
  return { n, counts, rates };
}

// ── corpus ───────────────────────────────────────────────────────────────
const corpusLines = fs.readFileSync(corpusPath, "utf8").split("\n").filter(Boolean);
const corpusTexts = [];
for (const line of corpusLines) {
  try {
    const row = JSON.parse(line);
    const text = String(row.content ?? row.raw ?? row.prompt ?? "").trim();
    if (text) corpusTexts.push(text);
  } catch {
    /* skip */
  }
}

const corpusPortraitTexts = corpusTexts.filter((t) => isPortraitPrompt(t));
const corpusAll = analyzePortraitPrompts(corpusTexts, 30);
const corpusPortrait = analyzePortraitPrompts(corpusPortraitTexts, 30);
const corpusPortraitSections = sectionRatesFromTexts(corpusPortraitTexts);

// ── eval ─────────────────────────────────────────────────────────────────
const runs = fs
  .readFileSync(path.join(evalDir, "runs.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);

const dimTouchCounts = {};
const sectionRunCounts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
const sectionPromptCounts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
let evalRunsWithPrompt = 0;

for (const run of runs) {
  if (run.terminationReason === "error") continue;
  const dims = new Set([
    ...(run.askedDimensions ?? []),
    ...(run.autoFilledDimensions ?? []).map((x) => x.questionId),
  ]);
  const sectionsHit = new Set();
  for (const d of dims) {
    dimTouchCounts[d] = (dimTouchCounts[d] || 0) + 1;
    const sec = DIM_TO_SECTION[d];
    if (sec) sectionsHit.add(sec);
  }
  for (const s of sectionsHit) sectionRunCounts[s] += 1;

  const prompt = run.finalPrompt?.zh ?? run.finalPrompt?.en ?? "";
  if (prompt) {
    evalRunsWithPrompt += 1;
    for (const s of detectPortraitSections(prompt)) {
      sectionPromptCounts[s] += 1;
    }
  }
}

const evalN = runs.filter((r) => r.terminationReason !== "error").length;
const evalSectionRates = Object.fromEntries(
  SECTIONS.map((s) => [s, pct(sectionRunCounts[s], evalN)])
);
const evalPromptSectionRates = Object.fromEntries(
  SECTIONS.map((s) => [s, pct(sectionPromptCounts[s], evalRunsWithPrompt)])
);

// ── deviation ────────────────────────────────────────────────────────────
const deviations = SECTIONS.map((s) => {
  const corpusRate = corpusPortraitSections.rates[s];
  const evalRate = evalSectionRates[s];
  const delta = Math.round((evalRate - corpusRate) * 10) / 10;
  return { section: s, corpusRate, evalRate, delta };
}).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

const topCorpusTokens = corpusPortrait.topTokens.slice(0, 15).map((t) => t.token);
const dimRanking = Object.entries(dimTouchCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([dim, count]) => ({ dim, count, rate: pct(count, evalN), section: DIM_TO_SECTION[dim] ?? "?" }));

const report = {
  evalDir,
  corpusPath,
  corpus: {
    totalRows: corpusTexts.length,
    portraitRows: corpusPortraitTexts.length,
    portraitRate: pct(corpusPortraitTexts.length, corpusTexts.length),
    sectionRates: corpusPortraitSections.rates,
    topTokens: corpusPortrait.topTokens.slice(0, 20),
  },
  eval: {
    totalRuns: runs.length,
    successfulRuns: evalN,
    precision: runs[0]?.precision ?? null,
    avgFinalDimCount:
      Math.round((runs.reduce((a, r) => a + (r.finalDimCount ?? 0), 0) / Math.max(1, evalN)) * 10) / 10,
    dimensionTouchRates: dimRanking,
    sectionRatesFromDims: evalSectionRates,
    sectionRatesFromFinalPrompt: evalPromptSectionRates,
  },
  deviation: deviations,
  interpretation: {
    overWeighted: deviations.filter((d) => d.delta > 15).map((d) => d.section),
    underWeighted: deviations.filter((d) => d.delta < -15).map((d) => d.section),
    corpusTokensWeUnderuse: topCorpusTokens.filter((tok) => {
      const lowStyle = ["lighting", "camera", "style", "scene"].some((s) =>
        corpusPortraitSections.rates[s] > 40 && (evalSectionRates[s] ?? 0) < corpusPortraitSections.rates[s] - 20
      );
      void lowStyle;
      return false;
    }),
  },
};

// Heuristic notes
const notes = [];
if (evalSectionRates.identity > corpusPortraitSections.rates.identity + 10) {
  notes.push("向导比语料更强调 identity（性别/年龄/肤色），简单模式 autofilled age_band 拉高。");
}
if (evalSectionRates.face > corpusPortraitSections.rates.face + 10) {
  notes.push("向导比语料更强调 face（表情/五官），portrait_expression + face_features autofilled。");
}
if (corpusPortraitSections.rates.lighting > evalSectionRates.lighting + 15) {
  notes.push("语料 lighting 覆盖远高于当前简单模式 eval（光线多在 secondary/autofill）。");
}
if (corpusPortraitSections.rates.style > evalSectionRates.style + 15) {
  notes.push("语料 style/画风词频高，但简单模式几乎不问 art_style/character_render_style。");
}
if (corpusPortraitSections.rates.outfit > evalSectionRates.outfit + 15) {
  notes.push("语料 outfit 常见，简单模式跳过服饰维度，专业模式才覆盖。");
}
if (corpusPortraitSections.rates.hair > evalSectionRates.hair + 10) {
  notes.push("语料 hair 标签不少，但简单模式不主动问 hair（靠 seed 文本或专业模式）。");
}
report.interpretation.notes = notes;

const outPath = path.join(evalDir, "corpus-compare.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

console.log(`Wrote ${outPath}\n`);
console.log(`Corpus: ${corpusPortraitTexts.length}/${corpusTexts.length} portrait (${report.corpus.portraitRate}%)`);
console.log(`Eval: ${evalN} runs, avg ${report.eval.avgFinalDimCount} dims in final brief\n`);
console.log("Section rate comparison (corpus portrait % vs eval dim-touch %):");
for (const d of deviations) {
  const flag = Math.abs(d.delta) >= 15 ? " ⚠" : "";
  console.log(`  ${d.section.padEnd(12)} corpus ${String(d.corpusRate).padStart(5)}%  eval ${String(d.evalRate).padStart(5)}%  Δ${d.delta >= 0 ? "+" : ""}${d.delta}%${flag}`);
}
if (notes.length) {
  console.log("\nNotes:");
  for (const n of notes) console.log(`  - ${n}`);
}
