#!/usr/bin/env tsx
/**
 * Stratified portrait seed sampler from extracted jsonl corpus.
 *
 * Usage:
 *   npm run sample-seeds -- .research/out/portrait-prompts-20260619.jsonl
 *   npm run sample-seeds -- .research/out/portrait-prompts-20260619.jsonl --out .research/eval-seeds/portrait-seeds-corpus.txt --count 20
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const input =
  process.argv.find((a) => a.endsWith(".jsonl")) ??
  ".research/out/portrait-prompts-20260619.jsonl";
const outIdx = process.argv.indexOf("--out");
const countIdx = process.argv.indexOf("--count");
const outFile =
  outIdx >= 0 ? process.argv[outIdx + 1] : ".research/eval-seeds/portrait-seeds-corpus.txt";
const targetCount = countIdx >= 0 ? Number(process.argv[countIdx + 1]) : 20;

/** Mirrors manual portrait-seeds.txt coverage for regression diversity. */
const BUCKETS = [
  { id: "photo-realistic", patterns: [/胶片|摄影|写真|写实|portrait|photograph|editorial/i], max: 3 },
  { id: "business", patterns: [/商务|职场|professional|corporate|headshot/i], max: 2 },
  { id: "otome-pov", patterns: [/乙女|POV|心动|对视|otome|visual novel/i], max: 2 },
  { id: "game-char", patterns: [/游戏|立绘|角色|game character|RPG|机甲/i], max: 2 },
  { id: "anime", patterns: [/二次元|动漫|anime|manga|日系|校园/i], max: 2 },
  { id: "cyberpunk", patterns: [/赛博|cyberpunk|neon|黑客/i], max: 1 },
  { id: "historical", patterns: [/古风|武侠|仙侠|historical|汉服/i], max: 2 },
  { id: "idol-vtuber", patterns: [/偶像|VTuber|Live2D|虚拟/i], max: 1 },
  { id: "cosplay", patterns: [/cosplay|漫展|cos/i], max: 1 },
  { id: "couple", patterns: [/情侣|婚纱|couple|双人/i], max: 1 },
  { id: "webtoon", patterns: [/韩漫|webtoon|manhwa/i], max: 1 },
  { id: "fashion", patterns: [/时尚|杂志|cover|editorial fashion/i], max: 1 },
  { id: "oc-fantasy", patterns: [/OC|原创|精灵|fantasy|elf/i], max: 1 },
];

async function loadTs(rel) {
  const root = path.resolve(import.meta.dirname, "../..");
  return import(pathToFileURL(path.join(root, rel)).href);
}

const { isPortraitPrompt, detectPortraitSections } = await loadTs(
  "src/lib/prompt/agent/portrait-prompt-analysis.ts",
);

function shorten(text, max = 50) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1) + "…";
}

function cjkScore(text) {
  return text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
}

function isUsableSeed(content) {
  if (content.length < 10 || content.length > 180) return false;
  if (!isPortraitPrompt(content)) return false;
  const sections = detectPortraitSections(content);
  if (!sections.has("subject")) return false;
  if (!sections.has("face") && !sections.has("hair") && !sections.has("outfit")) return false;
  if (/^\s*[{[]/.test(content)) return false;
  if (/\|\s*[-—]+\s*\|/.test(content)) return false;
  if (/^\|/.test(content.trim())) return false;
  if (/镜号|时长\(秒\)|render_goal|"subject"\s*:/.test(content)) return false;
  if (/第一步|第二步|图1上传|图2上传|--sref\s+\d/.test(content)) return false;
  if (/图[一二三四1234]|JSON|结构化|提示词|Stylebook|style guide|expression guide|\{argument/i.test(content))
    return false;
  if (/4等分|プロンプトを実行|朱迪和尼克|疯狂动物城/i.test(content)) return false;
  if (/[ぁ-んァ-ン]/.test(content) && cjkScore(content) < 4) return false;
  if (/论文|发布会|航拍|道观|建筑|风景|landscape|architecture|product on a/i.test(content)) return false;
  if (/视频|video|motion|animation|clip/i.test(content) && !/portrait|写真|半身|头像|证件照/i.test(content))
    return false;
  if ((content.match(/\n/g) ?? []).length > 1) return false;
  return true;
}

function bucketFor(text) {
  for (const bucket of BUCKETS) {
    if (bucket.patterns.some((re) => re.test(text))) return bucket.id;
  }
  return "other";
}

function seedQuality(text) {
  const len = text.length;
  const cjk = cjkScore(text);
  if (cjk < 4 && !/\b(portrait|girl|woman|man|face|character)\b/i.test(text)) return -1;
  const idealLen = len >= 10 && len <= 40 ? 15 : len <= 55 ? 8 : 0;
  const sections = detectPortraitSections(text);
  const sectionBonus = (sections.has("face") ? 3 : 0) + (sections.has("style") ? 2 : 0);
  return cjk * 3 + idealLen + sectionBonus;
}

const lines = fs.readFileSync(input, "utf8").split("\n").filter(Boolean);
const byBucket = new Map(BUCKETS.map((b) => [b.id, []]));
byBucket.set("other", []);

for (const line of lines) {
  try {
    const row = JSON.parse(line);
    const content = String(row.content ?? "").trim();
    if (!content || !isPortraitPrompt(content)) continue;
    if (!isUsableSeed(content)) continue;
    const seed = shorten(content);
    if (!isUsableSeed(seed) || /\{argument|4等分|プロンプト/i.test(seed)) continue;
    const id = bucketFor(content);
    byBucket.get(id).push({ seed, quality: seedQuality(seed) });
  } catch {
    /* skip */
  }
}

for (const [, list] of byBucket) {
  list.sort((a, b) => b.quality - a.quality || a.seed.localeCompare(b.seed));
}

const picked = [];
const seen = new Set();

function take(seed) {
  if (seen.has(seed)) return false;
  seen.add(seed);
  picked.push(seed);
  return true;
}

for (const bucket of BUCKETS) {
  const list = byBucket.get(bucket.id) ?? [];
  let n = 0;
  for (const { seed } of list) {
    if (n >= bucket.max) break;
    if (seedQuality(seed) < 0) continue;
    if (take(seed)) n++;
  }
}

if (picked.length < targetCount) {
  const rest = [];
  for (const [, list] of byBucket) {
    for (const { seed } of list) {
      if (!seen.has(seed)) rest.push(seed);
    }
  }
  rest.sort((a, b) => seedQuality(b) - seedQuality(a));
  for (const seed of rest) {
    if (picked.length >= targetCount) break;
    if (seedQuality(seed) < 0) continue;
    take(seed);
  }
}

const corpusOnly = [...picked];

const corpusHeader = [
  `# Corpus-stratified portrait seeds (${corpusOnly.length}) — ${new Date().toISOString().slice(0, 10)}`,
  `# Source: ${input}`,
  `# Buckets: ${BUCKETS.map((b) => b.id).join(", ")}`,
  "",
].join("\n");
fs.writeFileSync(outFile, corpusHeader + corpusOnly.join("\n") + "\n");
console.log(`Wrote ${corpusOnly.length} corpus seeds → ${outFile}`);

// Merge manual curated seeds for stable regression baseline
const manualPath = path.resolve(import.meta.dirname, "../eval-seeds/portrait-seeds.txt");
if (fs.existsSync(manualPath)) {
  const manual = fs
    .readFileSync(manualPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  for (const seed of manual) take(seed);
}

const combinedPath = path.resolve(import.meta.dirname, "../eval-seeds/portrait-seeds-combined.txt");
const combinedHeader = [
  `# Combined portrait eval seeds (${picked.length}) — ${new Date().toISOString().slice(0, 10)}`,
  `# Manual: portrait-seeds.txt + corpus: ${input}`,
  "",
].join("\n");
fs.writeFileSync(combinedPath, combinedHeader + picked.join("\n") + "\n");
console.log(`Wrote ${picked.length} combined seeds → ${combinedPath}`);
