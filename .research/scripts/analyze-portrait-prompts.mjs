#!/usr/bin/env tsx
/**
 * Analyze a portrait prompt corpus (one prompt per line in a .txt file).
 *
 * Usage:
 *   npm run analyze-prompts -- path/to/prompts.txt
 *   npm run analyze-prompts -- path/to/prompts.txt --top 30
 *
 * Excel: export the prompt column to CSV/TXT first, then point this script at the file.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzePortraitPrompts } from "../../src/lib/prompt/agent/portrait-prompt-analysis.ts";

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const file = positional[0];
  const topIdx = argv.indexOf("--top");
  const topN = topIdx >= 0 ? Number(argv[topIdx + 1]) : 20;
  return { file, topN };
}

const { file, topN } = parseArgs(process.argv.slice(2));

if (!file) {
  console.error("Usage: npm run analyze-prompts -- <prompts.txt> [--top N]");
  process.exit(1);
}

const text = readFileSync(resolve(file), "utf8");
const lines = [];
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) continue;
  if (file.endsWith(".jsonl")) {
    try {
      const row = JSON.parse(line);
      const content = String(row.content ?? row.raw ?? row.prompt ?? "").trim();
      if (content) lines.push(content);
    } catch {
      /* skip malformed jsonl rows */
    }
  } else {
    lines.push(line);
  }
}
const report = analyzePortraitPrompts(lines, topN);

console.log(JSON.stringify({
  file: resolve(file),
  totalRows: report.totalRows,
  portraitRows: report.portraitRows,
  portraitRate: report.totalRows ? report.portraitRows / report.totalRows : 0,
  sectionCounts: report.sectionCounts,
  topTokens: report.topTokens,
}, null, 2));
