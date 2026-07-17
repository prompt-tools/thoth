import "../../src/lib/prompt/init.ts";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  handleAdaptiveTurnRequest,
} from "../../src/lib/prompt/agent/adaptive-turn-runtime.ts";
import {
  projectAdaptiveErrorForBrowser,
  projectAdaptiveTurnForBrowser,
} from "../../src/lib/prompt/agent/adaptive-browser-projection.ts";
import { requestAdaptiveTurn } from "../../src/lib/prompt/agent/client.ts";
import { issueAcceptedAskToken } from "../../src/lib/prompt/agent/adaptive-turn-state.ts";
import { buildCatalogManifest } from "../../src/lib/prompt/agent/catalog-manifest.ts";
import { validateBranchClaims } from "./adaptive-replay-coverage.mjs";
import {
  ARTIFACT_VERSION, CORPUS_VERSION, FIXED_NOW, REQUIRED_BRANCHES, TURN_SECRET,
  compare, currentMetadata, evaluatorHash, parseArgs, productionDirtyPaths,
  readCorpus, repositoryCommit, sha256, writeArtifacts,
} from "./adaptive-replay-support.mjs";

export { currentMetadata } from "./adaptive-replay-support.mjs";

function expandInput(record) {
  const input = structuredClone(record.input);
  if (record.subjectBriefRepeat) {
    input.subjectBrief += record.subjectBriefRepeat.text.repeat(record.subjectBriefRepeat.count);
  }
  if (input.history?.length) {
    const answer = input.history.at(-1);
    const dimension = buildCatalogManifest().find((item) => item.questionId === answer.questionId);
    if (!dimension) return input;
    input.turnToken = issueAcceptedAskToken({
      secret: TURN_SECRET,
      subjectBrief: input.subjectBrief,
      history: input.history.slice(0, -1),
      questionId: answer.questionId,
      optionIds: answer.selectedOptionIds.length ? answer.selectedOptionIds : dimension.options.slice(0, 6).map((option) => option.id),
      mode: dimension.mode,
      maxSelections: dimension.maxSelections,
      now: FIXED_NOW,
    });
  }
  return input;
}

function compactNormalized(result, errorProjection) {
  if (errorProjection) {
    return { action: "error", source: "route", reason: errorProjection.code, questionId: null, optionIds: [] };
  }
  return {
    action: result.decision.done ? "completion" : "ask",
    source: result.diagnostics.source,
    reason: result.diagnostics.reason ?? null,
    questionId: result.decision.nextQuestionId,
    optionIds: result.decision.visibleOptionIds,
  };
}

function compactUi(projection) {
  if (projection.kind === "error") {
    return {
      action: "error",
      code: projection.code,
      status: projection.status,
      questionId: null,
      optionIds: [],
      freeTextAvailable: false,
    };
  }
  return {
    action: projection.kind,
    code: null,
    status: null,
    questionId: projection.decision.nextQuestionId,
    optionIds: projection.optionIds,
    freeTextAvailable: projection.freeTextAvailable,
  };
}

export async function replayRecord(record, metadata) {
  const evidence = [];
  let routeStatus = null;
  let exchangeCalls = 0;
  let requestBytes = null;
  const rawBytes = record.recording.kind === "http"
    ? Uint8Array.from(Buffer.from(record.recording.bodyBase64, "base64"))
    : undefined;
  const exchange = async (request) => {
    exchangeCalls += 1;
    requestBytes = Buffer.byteLength(request.body, "utf8");
    if (record.recording.kind === "none") throw new Error("unexpected_recorded_exchange");
    if (record.recording.kind === "network") {
      return { kind: "network", reason: record.recording.reason };
    }
    return {
      kind: "http",
      status: record.recording.status,
      headers: record.recording.headers ?? {},
      body: rawBytes,
    };
  };
  const fetcher = async (_url, init) => {
    const response = await handleAdaptiveTurnRequest(new Request("http://replay.local/api/adaptive-turn", init), {
      enabled: true,
      demoKey: "replay-key",
      turnSecret: TURN_SECRET,
      now: () => FIXED_NOW,
      exchange,
      onEvidence: (item) => evidence.push({
        ...item,
        ...(item.rawBody ? { rawBodyBase64: Buffer.from(item.rawBody).toString("base64"), rawBody: undefined } : {}),
      }),
    });
    routeStatus = response.status;
    return response;
  };

  let result;
  let browserProjection;
  try {
    result = await requestAdaptiveTurn("__demo__", expandInput(record), fetcher);
    browserProjection = projectAdaptiveTurnForBrowser(result, buildCatalogManifest());
  } catch (error) {
    browserProjection = projectAdaptiveErrorForBrowser(error);
  }
  const normalized = compactNormalized(result, browserProjection.kind === "error" ? browserProjection : null);
  const ui = compactUi(browserProjection);
  const failureCodes = browserProjection.kind === "error"
    ? [browserProjection.code]
    : result.diagnostics.source === "fallback" ? [result.diagnostics.reason] : [];
  const actual = { routeStatus, normalized, ui, hardFailureCodes: failureCodes };
  const diff = compare(record.expected, actual);
  const latestEvidence = evidence.at(-1) ?? {};
  const rawEvidenceMatches = record.recording.kind !== "http"
    || latestEvidence.rawBodyBase64 === record.recording.bodyBase64;
  const toolArgumentsMatch = record.recording.kind !== "http"
    || latestEvidence.toolArgumentsRaw === record.recording.toolArgumentsRaw;
  const injectedViolation = Boolean(record.injectedViolation);
  const forbiddenIds = record.forbiddenUiIds ?? [];
  const violationRendered = Boolean(forbiddenIds.some((id) => ui.optionIds.includes(id))
    || (record.forbiddenUiQuestionId && ui.questionId === record.forbiddenUiQuestionId));
  const acceptedAsModel = injectedViolation && normalized.source === "model";
  const outcome = {
    pass: diff.length === 0 && rawEvidenceMatches && toolArgumentsMatch && !acceptedAsModel && !violationRendered,
    diff,
    rawEvidenceMatches,
    toolArgumentsMatch,
    acceptedAsModel,
    violationRendered,
  };
  return {
    schemaVersion: ARTIFACT_VERSION,
    caseId: record.caseId,
    covers: record.covers,
    pinned: record.pinned,
    raw: {
      recording: record.recording,
      routeStatus,
      requestBytes,
      exchangeCalls,
      evidence: latestEvidence,
    },
    normalized,
    ui,
    judge: { status: "skipped", providerCalls: 0 },
    outcome,
    expected: record.expected,
    actual,
    metadata,
  };
}

export async function runAdaptiveReplay({ input, out }) {
  const metadata = currentMetadata();
  const dirtyProductionPaths = productionDirtyPaths();
  let corpus;
  try {
    corpus = readCorpus(input);
  } catch (error) {
    return { exitCode: 2, error: error instanceof Error ? error.message : "invalid_corpus" };
  }
  const metadataMismatches = corpus.records.reduce((count, record) => count + compare(record.pinned, metadata).length, 0);
  const observations = [];
  let routingProviderCalls = 0;
  if (metadataMismatches === 0 && dirtyProductionPaths.length === 0) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      routingProviderCalls += 1;
      throw new Error("replay_forbids_network_calls");
    };
    try {
      for (const record of corpus.records) observations.push(await replayRecord(record, metadata));
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
  const judgeProviderCalls = observations.reduce((sum, item) => sum + item.judge.providerCalls, 0);
  const coverage = validateBranchClaims(corpus.records, observations, REQUIRED_BRANCHES);
  const mismatches = observations.filter((item) => item.outcome.diff.length > 0).length;
  const undetectedViolations = observations.filter((item) => item.outcome.acceptedAsModel || item.outcome.violationRendered).length;
  const evidenceMismatches = observations.filter((item) => !item.outcome.rawEvidenceMatches || !item.outcome.toolArgumentsMatch).length;
  const passedCases = observations.filter((item) => item.outcome.pass).length;
  const pass = metadataMismatches === 0
    && dirtyProductionPaths.length === 0
    && coverage.missingBranches.length === 0
    && coverage.invalidBranchClaims.length === 0
    && routingProviderCalls === 0
    && judgeProviderCalls === 0
    && mismatches === 0
    && undetectedViolations === 0
    && evidenceMismatches === 0
    && passedCases === corpus.records.length;
  const summary = {
    pass,
    totalCases: corpus.records.length,
    passedCases,
    mismatches,
    metadataMismatches,
    dirtyProductionPaths,
    evidenceMismatches,
    undetectedViolations,
    missingBranches: coverage.missingBranches,
    invalidBranchClaims: coverage.invalidBranchClaims,
    requiredBranchCount: REQUIRED_BRANCHES.length,
    coveredBranchCount: coverage.coveredBranchCount,
    routingProviderCalls,
    judgeProviderCalls,
    recordedExchangeCalls: observations.reduce((sum, item) => sum + item.raw.exchangeCalls, 0),
  };
  const config = {
    artifactVersion: ARTIFACT_VERSION,
    corpusVersion: CORPUS_VERSION,
    mode: "replay",
    command: "npm run eval:adaptive -- --mode replay --input <input> --out <out>",
    corpusHash: sha256(corpus.bytes),
    evaluatorHash: evaluatorHash(),
    repositoryCommit: repositoryCommit(),
    metadata,
    model: "deepseek-v4-flash",
    randomization: "none",
    concurrency: 1,
    routingProviderCalls,
    judgeProviderCalls,
  };
  writeArtifacts(out, config, observations, summary);
  return { exitCode: pass ? 0 : 1, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode !== "replay" || !args.input || !args.out) {
    console.error("usage: eval-adaptive --mode replay --input <jsonl> --out <dir>");
    process.exitCode = 2;
  } else {
    const result = await runAdaptiveReplay({ input: path.resolve(args.input), out: path.resolve(args.out) });
    if (result.error) console.error(result.error);
    process.exitCode = result.exitCode;
  }
}
