/** Load prompt text lines from .jsonl, .csv (content column), or .txt. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function parseCsv(text) {
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

export function loadCorpusTexts(filePath) {
  const file = resolve(filePath);
  const text = readFileSync(file, "utf8");

  if (file.endsWith(".jsonl")) {
    const texts = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        const content = String(row.content ?? row.raw ?? row.prompt ?? "").trim();
        if (content) texts.push(content);
      } catch {
        /* skip */
      }
    }
    return texts;
  }

  if (file.endsWith(".csv")) {
    const rows = parseCsv(text);
    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const contentIdx = header.indexOf("content");
    if (contentIdx < 0) {
      throw new Error(`CSV missing "content" column. Found: ${header.join(", ")}`);
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
