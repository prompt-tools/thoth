#!/usr/bin/env tsx
/**
 * Analyze a portrait prompt corpus (.txt one-per-line, .jsonl, or .csv with content column).
 *
 * Usage:
 *   npm run analyze-prompts -- path/to/prompts.txt
 *   npm run analyze-prompts -- path/to/prompts.csv --top 30 --out .research/out/report.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzePortraitPrompts } from "../../src/lib/prompt/agent/portrait-prompt-analysis.ts";

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const file = positional[0];
  const topIdx = argv.indexOf("--top");
  const topN = topIdx >= 0 ? Number(argv[topIdx + 1]) : 20;
  const outIdx = argv.indexOf("--out");
  const outFile = outIdx >= 0 ? argv[outIdx + 1] : undefined;
  return { file, topN, outFile };
}

/** RFC 4180-ish CSV → array of string[] (handles quoted fields with newlines). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function loadPromptLines(file, text) {
  const abs = resolve(file);
  if (file.endsWith(".jsonl")) {
    const lines = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        const content = String(row.content ?? row.raw ?? row.prompt ?? "").trim();
        if (content) lines.push(content);
      } catch {
        /* skip malformed jsonl rows */
      }
    }
    return lines;
  }

  if (file.endsWith(".csv")) {
    const rows = parseCsv(text);
    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const contentIdx = header.indexOf("content");
    if (contentIdx < 0) {
      console.error(`CSV missing "content" column. Found: ${header.join(", ")}`);
      process.exit(1);
    }
    return rows
      .slice(1)
      .map((row) => String(row[contentIdx] ?? "").trim())
      .filter(Boolean);
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const { file, topN, outFile } = parseArgs(process.argv.slice(2));

if (!file) {
  console.error("Usage: npm run analyze-prompts -- <prompts.txt|jsonl|csv> [--top N] [--out report.json]");
  process.exit(1);
}

const text = readFileSync(resolve(file), "utf8");
const lines = loadPromptLines(file, text);
const report = analyzePortraitPrompts(lines, topN);

const payload = {
  file: resolve(file),
  totalRows: report.totalRows,
  portraitRows: report.portraitRows,
  portraitRate: report.totalRows ? report.portraitRows / report.totalRows : 0,
  sectionCounts: report.sectionCounts,
  topTokens: report.topTokens,
};

if (outFile) {
  writeFileSync(resolve(outFile), `${JSON.stringify(payload, null, 2)}\n`);
  console.error(`Wrote ${resolve(outFile)}`);
}
console.log(JSON.stringify(payload, null, 2));
