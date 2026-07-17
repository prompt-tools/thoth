import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAdaptiveReplay } from "./eval-adaptive.mjs";
import { parseArgs } from "./adaptive-replay-support.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CORPUS = path.join(ROOT, ".research/adaptive-question-recordings.jsonl");
const ARTIFACTS = ["run-config.json", "observations.jsonl", "summary.json", "report.md", "bundle-sha256.json"];
const dirs = [];

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `thoth-${label}-`));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("deterministic Adaptive replay gate", () => {
  it("passes the checked-in corpus with zero provider/judge calls and byte-identical bundles", async () => {
    const first = tempDir("adaptive-replay-a");
    const second = tempDir("adaptive-replay-b");

    const firstRun = await runAdaptiveReplay({ input: CORPUS, out: first });
    const secondRun = await runAdaptiveReplay({ input: CORPUS, out: second });

    expect(firstRun.exitCode, firstRun.error).toBe(0);
    expect(secondRun.exitCode, secondRun.error).toBe(0);
    for (const artifact of ARTIFACTS) {
      expect(fs.readFileSync(path.join(first, artifact)))
        .toEqual(fs.readFileSync(path.join(second, artifact)));
    }
    const summary = JSON.parse(fs.readFileSync(path.join(first, "summary.json"), "utf8"));
    expect(summary).toMatchObject({
      pass: true,
      routingProviderCalls: 0,
      judgeProviderCalls: 0,
      mismatches: 0,
      undetectedViolations: 0,
      missingBranches: [],
      invalidBranchClaims: [],
      dirtyProductionPaths: [],
    });
  });

  it("exits nonzero for a deliberately wrong expectation", async () => {
    const inputDir = tempDir("adaptive-replay-wrong-input");
    const out = tempDir("adaptive-replay-wrong-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    records[0].expected.routeStatus = 599;
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.pass).toBe(false);
    expect(summary.mismatches).toBeGreaterThan(0);
  });

  it("exits nonzero before replay when pinned metadata does not match current code", async () => {
    const inputDir = tempDir("adaptive-replay-hash-input");
    const out = tempDir("adaptive-replay-hash-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    records[0].pinned.catalogHash = "sha256:deliberately-wrong";
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.pass).toBe(false);
    expect(summary.metadataMismatches).toBeGreaterThan(0);
  });

  it("exits nonzero when a required replay branch is missing", async () => {
    const inputDir = tempDir("adaptive-replay-missing-branch-input");
    const out = tempDir("adaptive-replay-missing-branch-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    for (const record of records) record.covers = record.covers.filter((branch) => branch !== "valid.ask");
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.pass).toBe(false);
    expect(summary.missingBranches).toContain("valid.ask");
  });

  it("rejects a branch label that is attached to the wrong semantic case", async () => {
    const inputDir = tempDir("adaptive-replay-false-claim-input");
    const out = tempDir("adaptive-replay-false-claim-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    const real = records.find((record) => record.caseId === "catalog-unknown-question");
    const falseClaim = records.find((record) => record.caseId === "valid-ask");
    real.covers = real.covers.filter((branch) => branch !== "catalog.unknown_question");
    falseClaim.covers.push("catalog.unknown_question");
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.missingBranches).not.toContain("catalog.unknown_question");
    expect(summary.invalidBranchClaims).toContain("catalog.unknown_question");
  });

  it.each([
    ["tool-missing-call", "tool-wrong-function", "tool.missing_call"],
    ["ask-blank-text", "ask-duplicate-ids", "ask.blank_text"],
  ])("rejects same-family payload substitution for %s", async (targetId, sourceId, branch) => {
    const inputDir = tempDir(`adaptive-replay-substitution-${targetId}`);
    const out = tempDir(`adaptive-replay-substitution-out-${targetId}`);
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    const target = records.find((record) => record.caseId === targetId);
    const source = records.find((record) => record.caseId === sourceId);
    target.recording = structuredClone(source.recording);
    target.expected = structuredClone(source.expected);
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.invalidBranchClaims).toContain(branch);
  });

  it("rejects finish-reason metadata that disagrees with the raw provider envelope", async () => {
    const inputDir = tempDir("adaptive-replay-finish-substitution");
    const out = tempDir("adaptive-replay-finish-substitution-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    const length = records.find((record) => record.caseId === "finish-length");
    const contentFilter = records.find((record) => record.caseId === "finish-content_filter");
    length.recording.bodyBase64 = contentFilter.recording.bodyBase64;
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode).toBe(1);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.invalidBranchClaims).toContain("finish.length");
  });

  it("does not treat a neighboring flag as a missing CLI value", () => {
    expect(parseArgs(["--mode", "replay", "--input", CORPUS, "--out"]))
      .toEqual({ mode: "replay", input: CORPUS, out: undefined });
  });
});
