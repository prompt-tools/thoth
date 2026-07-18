import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { currentMetadata, runAdaptiveReplay } from "./eval-adaptive.mjs";
import { parseArgs, sha256, writeArtifacts } from "./adaptive-replay-support.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CORPUS = path.join(ROOT, ".research/adaptive-question-recordings.jsonl");
const ARTIFACTS = ["run-config.json", "observations.jsonl", "summary.json", "report.md", "bundle-sha256.json"];
const dirs = [];

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `thoth-${label}-`));
  dirs.push(dir);
  return dir;
}

function pinCurrentMetadata(records) {
  const metadata = currentMetadata();
  for (const record of records) record.pinned = structuredClone(metadata);
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

  it("keeps production-like input and provider content out of every replay artifact", async () => {
    const inputDir = tempDir("adaptive-replay-content-free-input");
    const out = tempDir("adaptive-replay-content-free-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    pinCurrentMetadata(records);
    const record = records.find((item) => item.caseId === "valid-ask");
    const sentinel = "PRODUCTION_REPLAY_SENTINEL_4d9c0b";
    record.covers.push(sentinel);
    record.input.subjectBrief = `原创游侠角色 ${sentinel}`;
    record.recording.responseId = sentinel;
    const provider = JSON.parse(Buffer.from(record.recording.bodyBase64, "base64").toString("utf8"));
    const call = provider.choices[0].message.tool_calls[0];
    const argumentsValue = JSON.parse(call.function.arguments);
    argumentsValue.questionText = `${argumentsValue.questionText} ${sentinel}`;
    call.function.arguments = JSON.stringify(argumentsValue);
    provider.choices[0].message.content = sentinel;
    record.recording.toolArgumentsRaw = call.function.arguments;
    record.recording.bodyBase64 = Buffer.from(JSON.stringify(provider), "utf8").toString("base64");
    fs.writeFileSync(input, `${records.map(JSON.stringify).join("\n")}\n`);

    const result = await runAdaptiveReplay({ input, out });

    expect(result.exitCode, result.error).toBe(0);
    const bundle = ARTIFACTS.map((artifact) => fs.readFileSync(path.join(out, artifact), "utf8")).join("\n");
    expect(bundle).not.toContain(sentinel);
    const artifactObservations = fs.readFileSync(path.join(out, "observations.jsonl"), "utf8");
    expect(artifactObservations).not.toContain("bodyBase64");
    expect(artifactObservations).not.toContain("rawBodyBase64");
    expect(artifactObservations).not.toContain("toolArgumentsRaw");
    expect(artifactObservations).not.toContain('"message"');
    const artifactRecord = artifactObservations.trimEnd().split("\n").map(JSON.parse)
      .find((item) => item.caseId === "valid-ask");
    expect(artifactRecord.raw.recording).toMatchObject({
      responseBytes: Buffer.from(record.recording.bodyBase64, "base64").byteLength,
      responseHash: sha256(Buffer.from(record.recording.bodyBase64, "base64")),
      toolArgumentsBytes: Buffer.byteLength(record.recording.toolArgumentsRaw, "utf8"),
      toolArgumentsHash: sha256(record.recording.toolArgumentsRaw),
    });
    expect(artifactRecord.outcome).toMatchObject({
      pass: true,
      rawEvidenceMatches: true,
      toolArgumentsMatch: true,
    });
    const hashes = JSON.parse(fs.readFileSync(path.join(out, "bundle-sha256.json"), "utf8"));
    for (const [artifact, hash] of Object.entries(hashes)) {
      expect(hash).toBe(sha256(fs.readFileSync(path.join(out, artifact))));
    }
  });

  it("sanitizes arbitrary branch claims at the artifact sink", () => {
    const out = tempDir("adaptive-replay-branch-summary");
    const sentinel = "PRODUCTION_BRANCH_SENTINEL_c8a71e";
    writeArtifacts(out, { artifactVersion: "test" }, [], {
      pass: false,
      totalCases: 0,
      passedCases: 0,
      mismatches: 0,
      undetectedViolations: 0,
      invalidBranchClaims: [sentinel],
      missingBranches: [sentinel, "valid.ask"],
    });

    const bundle = ARTIFACTS.map((artifact) => fs.readFileSync(path.join(out, artifact), "utf8")).join("\n");
    expect(bundle).not.toContain(sentinel);
    const summary = JSON.parse(fs.readFileSync(path.join(out, "summary.json"), "utf8"));
    expect(summary.invalidBranchClaims).toEqual([sha256(sentinel)]);
    expect(summary.missingBranches).toEqual(["valid.ask"]);
  });

  it("exits nonzero for a deliberately wrong expectation", async () => {
    const inputDir = tempDir("adaptive-replay-wrong-input");
    const out = tempDir("adaptive-replay-wrong-out");
    const input = path.join(inputDir, "recordings.jsonl");
    const records = fs.readFileSync(CORPUS, "utf8").trimEnd().split("\n").map(JSON.parse);
    pinCurrentMetadata(records);
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
