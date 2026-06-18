#!/usr/bin/env tsx
/**
 * Headless eval/fuzz harness for the prompt-agent flow.
 * Reuses the same pure functions (buildTurnRequest, parseTurnResponse, etc.)
 * as the browser controller — zero drift from the UI path.
 *
 * Usage:
 *   tsx .research/scripts/eval-agent.mjs --provider deepseek --max-runs 4 --max-turns 10
 *   CIPG_EVAL_API_KEY=sk-xxx tsx .research/scripts/eval-agent.mjs --provider deepseek
 *   npm run eval -- --provider deepseek --dry-run --max-runs 2 --max-turns 8
 *
 * Requires Node ≥ 22.6 (--experimental-strip-types in 22.x; native in 23.6+).
 * Worst-case LLM calls: maxRuns × maxTurns.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { initLangfuse, traceRun, shutdownLangfuse } from "./eval-langfuse.mjs";
import { llmAnswer } from "./llm-user/answerer.mjs";

// ── arg parsing ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1] ?? fallback;
}
const PROVIDER_ID = flag("provider", "deepseek");
const MAX_RUNS = Number(flag("max-runs", "4"));
const MAX_TURNS = Number(flag("max-turns", "10"));
const WORKERS = Number(flag("workers", "4"));
const SEED_FILE = flag("seeds", ".research/eval-seeds/seeds.txt");
const BASE_SEED = Number(flag("seed", "42"));
const DRY_RUN = args.includes("--dry-run");
const PRECISION = flag("precision", "simple");
const ANSWERER = flag("answerer", "random"); // "llm" = Claude haiku user-sim; "random" = legacy
// Repeat the whole seed set ROUNDS times, each round with a distinct PRNG seed
// per run — simulates many different users answering the same scenarios. Total
// runs = ROUNDS × (seeds capped by max-runs). Default 1 = original behaviour.
const ROUNDS = Math.max(1, Number(flag("rounds", "1")));
// Optional suffix on the output dir (e.g. an A/B run name). The provider+model
// is ALWAYS in the dir name regardless, so concurrent runs never collide.
const LABEL = flag("label", "");

// ── dynamic imports (strip-types via Node 23.6+ or --experimental-strip-types) ─
const root = path.resolve(import.meta.dirname, "../..");

async function loadTs(rel) {
  return import(pathToFileURL(path.join(root, rel)).href);
}

// Must import init first — registers options + validates worktypes.
await loadTs("src/lib/prompt/init.ts");

const { buildTurnRequest, parseTurnResponse, runAgentTurn, autoFillDimensions } = await loadTs("src/lib/prompt/agent/client.ts");
const { resolveVisibleOptions } = await loadTs("src/lib/prompt/agent/options-resolver.ts");
const { appendAnswer, buildRenderInputs } = await loadTs("src/lib/prompt/agent/history.ts");
const { buildCatalogManifest } = await loadTs("src/lib/prompt/agent/catalog-manifest.ts");
const { getProvider, PROVIDER_PRESETS } = await loadTs("src/lib/prompt/agent/providers.ts");
const { renderPrompt } = await loadTs("src/lib/prompt/adapters.ts");
const { routePrimaryType } = await loadTs("src/lib/prompt/agent/routing.ts");
const { imagePromptAgentWorkType } = await loadTs("src/lib/prompt/work-types/image-prompt-agent.worktype.ts");
const { computeFillSet } = await loadTs("src/lib/prompt/agent/fill.ts");

// ── validate provider ────────────────────────────────────────────────────
if (!PROVIDER_PRESETS.some((p) => p.id === PROVIDER_ID)) {
  console.error(`Error: unknown provider "${PROVIDER_ID}". Valid: ${PROVIDER_PRESETS.map((p) => p.id).join(", ")}`);
  process.exit(1);
}
const provider = getProvider(PROVIDER_ID);

const API_KEY = process.env.CIPG_EVAL_API_KEY;
// LLM-as-user provider is configurable (the answerer is provider-agnostic). Default
// anthropic; deepseek/mimo are OpenAI-shaped fallbacks. NOTE: the user-sim must NOT be
// the same model family as the JUDGE (MiMo) — using mimo here re-creates the self-bias
// loop the design forbids. deepseek keeps the judge independent.
const ANSWERER_PROVIDER_ID = flag("answerer-provider", "anthropic");
const ANSWERER_KEY_ENV = { anthropic: "ANTHROPIC_API_KEY", deepseek: "CIPG_EVAL_API_KEY", mimo: "XIAOMI_API_KEY" }[ANSWERER_PROVIDER_ID] ?? "ANTHROPIC_API_KEY";
const answererProvider = getProvider(ANSWERER_PROVIDER_ID);
const ANSWERER_API_KEY = process.env[ANSWERER_KEY_ENV];
if (ANSWERER === "llm" && !ANSWERER_API_KEY && !DRY_RUN) {
  console.error(`Error: --answerer llm --answerer-provider ${ANSWERER_PROVIDER_ID} needs ${ANSWERER_KEY_ENV} (add it to .env.eval).`);
  process.exit(1);
}
if (!API_KEY && !DRY_RUN) {
  console.error("Error: set CIPG_EVAL_API_KEY env var (or use --dry-run for a single mock run).");
  process.exit(1);
}

// ── seeds ────────────────────────────────────────────────────────────────
const seedPath = path.resolve(root, SEED_FILE);
if (!fs.existsSync(seedPath)) {
  console.error(`Error: seed file not found: ${seedPath}`);
  console.error("Create it with one description per line, then re-run.");
  process.exit(1);
}
// Trim each line before storing so the stored seed text matches what
// langfuse-dataset.mjs uploads (which also trims) — otherwise dataset-run
// linkage silently misses on lines with trailing whitespace.
const allSeeds = fs
  .readFileSync(seedPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
if (allSeeds.length === 0) {
  console.error("Error: seed file is empty.");
  process.exit(1);
}
const seeds = allSeeds.slice(0, MAX_RUNS);

// ── manifest + catalog hash ──────────────────────────────────────────────
const manifest = buildCatalogManifest();
const catalogVersion = sha(
  manifest.map((d) => `${d.questionId}:${d.options.map((o) => o.id).join(",")}`).join("|")
);

function sha(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

// ── mulberry32 PRNG ──────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── question bounds lookup (C3) ──────────────────────────────────────────
const questionBounds = new Map(
  imagePromptAgentWorkType.questions.map((q) => [q.id, { min: q.minSelections, max: q.maxSelections }])
);

// ── canned free-text phrases ─────────────────────────────────────────────
const CANNED_FREETEXT = [
  "柔和的自然光",
  "略微俯拍",
  "温暖的色调",
  "电影感的颗粒",
  "浅景深虚化",
  "几何构图",
  "复古胶片质感",
  "高对比度",
];

// ── flatten selections (H3: match browser exactly) ───────────────────────
function flattenSelections(history) {
  return Object.values(buildRenderInputs(history, manifest).selections).flatMap((v) =>
    Array.isArray(v) ? v : [v]
  );
}

// ── auto-answering strategy ──────────────────────────────────────────────
function autoAnswer(dim, shown, rng) {
  const visible = shown.visible;
  if (visible.length === 0) return { pickedIds: [], freeText: undefined, skipped: true, kind: "skip" };

  const mode = dim.mode;
  const bounds = questionBounds.get(dim.questionId) ?? {};

  // 8% skip
  if (rng() < 0.08) {
    return { pickedIds: [], freeText: undefined, skipped: true, kind: "skip" };
  }

  // free_text mode → only produce freeText
  if (mode === "free_text") {
    const text = CANNED_FREETEXT[Math.floor(rng() * CANNED_FREETEXT.length)];
    return { pickedIds: [], freeText: text, skipped: false, kind: "freetext" };
  }

  // 8% freeText escape hatch (for non-free_text modes)
  if (rng() < 0.08) {
    const text = CANNED_FREETEXT[Math.floor(rng() * CANNED_FREETEXT.length)];
    return { pickedIds: [], freeText: text, skipped: false, kind: "freetext" };
  }

  if (mode === "single") {
    const pick = visible[Math.floor(rng() * visible.length)];
    return { pickedIds: [pick.id], freeText: undefined, skipped: false, kind: "pick" };
  }

  // multi
  const minN = bounds.min ?? 1;
  const maxN = Math.min(bounds.max ?? visible.length, visible.length);
  // bias toward 1-2
  const n = Math.max(minN, Math.min(maxN, rng() < 0.6 ? 1 : 2));
  const shuffled = [...visible].sort(() => rng() - 0.5);
  const pickedIds = shuffled.slice(0, n).map((o) => o.id);
  return { pickedIds, freeText: undefined, skipped: false, kind: "pick" };
}

const MAX_429_RETRIES = 5;

// ── single run ───────────────────────────────────────────────────────────
async function runOne(runId, seedValue, description) {
  const rng = mulberry32(seedValue);
  const history = [];
  const turns = [];
  let answererFallbacks = 0;
  let terminationReason = "maxTurns";
  let consecutiveFallbacks = 0;
  const startedAt = Date.now();

  for (let turnIndex = 0; turnIndex < MAX_TURNS; turnIndex++) {
    // 429 retry counter reset per-turn (S4: avoid early-turn burst killing later turns)
    let retries429 = 0;
    // Transport that handles 429 backoff for the harness
    const nodeTransport = async (proxyReq) => {
      if (DRY_RUN) {
        const { ctx } = buildTurnRequest(provider, API_KEY ?? "dry-run", { manifest, history, userDescription: description });
        return mockResponse(ctx, turnIndex);
      }
      let attempt = 0;
      while (true) {
        try {
          return await providerFetch(proxyReq);
        } catch (e) {
          const status = e && typeof e === "object" && "status" in e ? e.status : undefined;
          if (status === 429) {
            attempt++;
            retries429++;
            if (retries429 >= MAX_429_RETRIES) throw e;
            await sleep(2000 * attempt);
            continue;
          }
          throw e;
        }
      }
    };

    const t0 = Date.now();
    let result;
    try {
      result = await runAgentTurn(provider, API_KEY ?? "dry-run", {
        manifest,
        history,
        userDescription: description,
        precision: PRECISION,
      }, nodeTransport, { maxCorrectionRetries: 2 });
    } catch (e) {
      // Only transport/network errors reach here
      turns.push({
        turnIndex,
        tier: "overall",
        offeredDimensionIds: [],
        error: e instanceof Error ? e.message : String(e),
        latencyMs: 0,
      });
      terminationReason = "error";
      break;
    }
    const latencyMs = Date.now() - t0;
    const { decision, ctx, diagnostics } = result;

    // Track consecutive fallbacks
    if (diagnostics.fallbackUsed) {
      consecutiveFallbacks++;
    } else {
      consecutiveFallbacks = 0;
    }

    // Consecutive fallback cap (M1)
    if (consecutiveFallbacks >= 2) {
      turns.push({
        turnIndex,
        tier: ctx.tier,
        offeredDimensionIds: ctx.pool.map((d) => d.questionId),
        nextQuestionId: decision.nextQuestionId,
        shownOptionIds: [],
        decisionVisibleOptionIds: decision.visibleOptionIds,
        droppedInvalidOptionIds: diagnostics.droppedInvalidOptionIds,
        attemptedTierJump: diagnostics.attemptedTierJump,
        outOfPool: diagnostics.outOfPool,
        repeatedDimension: false,
        conflictDropped: [],
        answer: { kind: "skip", ids: [], text: undefined },
        latencyMs,
        diagnostics: { attempts: diagnostics.attempts, corrected: diagnostics.corrected, fallbackUsed: diagnostics.fallbackUsed, source: diagnostics.source, usage: diagnostics.usage },
      });
      terminationReason = "fallbackGiveUp";
      break;
    }

    const repeatedDimension = history.some((h) => h.questionId === diagnostics.rawNextQuestionId);

    // done / done_empty
    if (decision.done) {
      turns.push({
        turnIndex,
        tier: ctx.tier,
        offeredDimensionIds: ctx.pool.map((d) => d.questionId),
        nextQuestionId: decision.nextQuestionId,
        shownOptionIds: [],
        decisionVisibleOptionIds: decision.visibleOptionIds,
        droppedInvalidOptionIds: diagnostics.droppedInvalidOptionIds,
        attemptedTierJump: diagnostics.attemptedTierJump,
        outOfPool: diagnostics.outOfPool,
        repeatedDimension,
        conflictDropped: [],
        answer: { kind: "done" },
        latencyMs,
        diagnostics: { attempts: diagnostics.attempts, corrected: diagnostics.corrected, fallbackUsed: diagnostics.fallbackUsed, source: diagnostics.source, usage: diagnostics.usage },
      });
      terminationReason =
        history.length === 0 ? "done_empty" : (diagnostics.source === "remainingEmpty" ? "remainingEmpty" : diagnostics.source);
      break;
    }

    // resolve visible options (H3: use flattenSelections)
    const dim = manifest.find((d) => d.questionId === decision.nextQuestionId);
    // With runAgentTurn's fallback, dim should always exist. Guard just in case.
    if (!dim) {
      turns.push({
        turnIndex,
        tier: ctx.tier,
        offeredDimensionIds: ctx.pool.map((d) => d.questionId),
        nextQuestionId: decision.nextQuestionId,
        error: "dimension not found in manifest (should not happen with fallback)",
        latencyMs,
      });
      terminationReason = "error";
      break;
    }

    const shown = resolveVisibleOptions(dim, decision.visibleOptionIds, flattenSelections(history));

    // auto-answer
    let ans;
    if (ANSWERER === "llm" && !DRY_RUN) {
      ans = await llmAnswer(dim, shown, {
        seed: description,
        priorAnswers: history,
        bounds: questionBounds.get(dim.questionId),
        provider: answererProvider,
        apiKey: ANSWERER_API_KEY,
      });
      if (ans.fallback) answererFallbacks++;
    } else {
      ans = autoAnswer(dim, shown, rng);
    }
    const nextHistory = appendAnswer(history, dim.questionId, ans.pickedIds, ans.freeText);
    history.length = 0;
    history.push(...nextHistory);

    turns.push({
      turnIndex,
      tier: ctx.tier,
      offeredDimensionIds: ctx.pool.map((d) => d.questionId),
      nextQuestionId: decision.nextQuestionId,
      shownOptionIds: shown.visible.map((o) => o.id),
      decisionVisibleOptionIds: decision.visibleOptionIds,
      droppedInvalidOptionIds: diagnostics.droppedInvalidOptionIds,
      attemptedTierJump: diagnostics.attemptedTierJump,
      outOfPool: diagnostics.outOfPool,
      repeatedDimension,
      conflictDropped: shown.conflictDropped,
      answer: { kind: ans.kind, ids: ans.pickedIds, text: ans.freeText },
      latencyMs,
      diagnostics: { attempts: diagnostics.attempts, corrected: diagnostics.corrected, fallbackUsed: diagnostics.fallbackUsed, source: diagnostics.source, usage: diagnostics.usage },
    });
  }

  // A6: auto-fill secondary dimensions (same logic as controller)
  const autoFilledDimensions = [];
  // P1-E2 fix: skip auto-fill on fallbackGiveUp (matches controller behavior)
  if (PRECISION !== "detailed" && terminationReason !== "error" && terminationReason !== "fallbackGiveUp") {
    const type = routePrimaryType(description);
    const fillSet = computeFillSet(type, history, manifest);

    if (fillSet.length > 0) {
      try {
        const fillTransport = async (proxyReq) => {
          if (DRY_RUN) {
            return mockFillResponse(fillSet, manifest);
          }
          return providerFetch(proxyReq);
        };

        const fillResults = await autoFillDimensions(provider, API_KEY ?? "dry-run", {
          manifest,
          history,
          fillSet,
          userDescription: description,
        }, fillTransport);

        for (const r of fillResults) {
          const nextH = appendAnswer(history, r.questionId, r.selectedOptionIds);
          history.length = 0;
          history.push(...nextH);
          autoFilledDimensions.push({
            questionId: r.questionId,
            selectedOptionIds: r.selectedOptionIds,
          });
        }
      } catch {
        // auto-fill failure is non-fatal in eval
      }
    }
  }

  // final render
  const { selections, freeTexts } = buildRenderInputs(history, manifest);
  let finalPrompt = { zh: "", en: "", zhEmpty: true, enEmpty: true };
  try {
    const rendered = renderPrompt({
      workType: imagePromptAgentWorkType,
      rawIntent: description, // seed-anchor: keep subject identity the catalog can't represent
      selections,
      freeTexts,
    });
    finalPrompt = {
      zh: rendered.zhPrompt,
      en: rendered.enPrompt,
      zhEmpty: !rendered.zhPrompt?.trim(),
      enEmpty: !rendered.enPrompt?.trim(),
    };
  } catch {
    // render failed — leave as empty
  }

  // systemPromptHash from first turn's proxyReq
  const firstReq = turns[0] ? buildTurnRequest(provider, API_KEY ?? "dry-run", { manifest, history: [], userDescription: description }).proxyReq : null;
  const systemPromptHash = firstReq ? sha(JSON.stringify(firstReq.body)) : "n/a";

  return {
    runId,
    seed: seedValue,
    description,
    provider: provider.id,
    routingModel: provider.routingModel,
    catalogVersion,
    systemPromptHash,
    precision: PRECISION,
    primaryType: routePrimaryType(description),
    turns,
    terminationReason,
    turnCount: turns.length,
    finalPrompt,
    askedDimensions: history.map((h) => h.questionId),
    autoFilledDimensions,
    answerer: ANSWERER,
    answererFallbacks,
    finalDimCount: history.length,
    startedAt,
    endedAt: Date.now(),
  };
}

// ── direct provider fetch (bypasses Next.js proxy) ───────────────────────
async function providerFetch(proxyReq) {
  const res = await fetch(proxyReq.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...proxyReq.headers },
    body: JSON.stringify(proxyReq.body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-JSON: ${text.slice(0, 200)}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockResponse(ctx, turnIndex) {
  const dim = ctx.pool[turnIndex % ctx.pool.length];
  if (!dim) return { choices: [{ message: { tool_calls: [{ function: { name: "decide_next_step", arguments: JSON.stringify({ nextQuestionId: "", visibleOptionIds: [], done: true }) } }] } }] };
  const n = Math.min(3, dim.options.length);
  const start = (turnIndex * 2) % Math.max(1, dim.options.length - n + 1);
  return {
    choices: [{
      message: {
        tool_calls: [{
          function: {
            name: "select_options",
            arguments: JSON.stringify({
              visibleOptionIds: dim.options.slice(start, start + n).map((o) => o.id),
              helperText: `请选择${dim.title || dim.questionId}`,
            }),
          },
        }],
      },
    }],
  };
}

/** Mock response for autoFillDimensions in dry-run mode.
 *  Picks the first option for each fill dimension to keep things deterministic. */
function mockFillResponse(fillSet, manifest) {
  const picks = [];
  for (const qid of fillSet) {
    const dim = manifest.find((d) => d.questionId === qid);
    if (!dim || dim.options.length === 0) continue;
    picks.push({ questionId: qid, optionIds: [dim.options[0].id] });
  }
  return {
    choices: [{
      message: {
        tool_calls: [{
          function: {
            name: "fill_dimensions",
            arguments: JSON.stringify({ picks }),
          },
        }],
      },
    }],
  };
}

// ── main ─────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
// Tag the dir with the actual provider + model so concurrent runs land in
// separate dirs and the model that produced the data is unambiguous.
const safeTag = (s) => String(s).replace(/[^a-zA-Z0-9._-]/g, "-");
const modelTag = safeTag(`${provider.id}-${provider.routingModel}`);
const dirName = `${stamp}__${modelTag}${LABEL ? "__" + safeTag(LABEL) : ""}`;
const outDir = path.join(root, ".research/out/eval", dirName);
fs.mkdirSync(outDir, { recursive: true });

const TOTAL = ROUNDS * seeds.length;

const config = {
  provider: provider.id,
  providerLabel: provider.label,
  routingModel: provider.routingModel,
  label: LABEL || null,
  policy: "random",
  precision: PRECISION,
  answerer: ANSWERER,
  answererProvider: ANSWERER === "llm" ? ANSWERER_PROVIDER_ID : null,
  answererModel: ANSWERER === "llm" ? answererProvider.routingModel : null,
  seedFile: SEED_FILE,
  seedCount: seeds.length,
  rounds: ROUNDS,
  totalRuns: TOTAL,
  maxRuns: MAX_RUNS,
  maxTurns: MAX_TURNS,
  workers: WORKERS,
  catalogVersion,
  startedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "config.json"), JSON.stringify(config, null, 2), "utf8");

console.log(`eval-agent: ${seeds.length} seeds × ${ROUNDS} rounds = ${TOTAL} runs, provider=${provider.id}, precision=${PRECISION}, maxTurns=${MAX_TURNS}`);
console.log(`catalog: ${manifest.length} dimensions, version=${catalogVersion}`);
console.log(`output: ${outDir}`);
console.log(`worst-case LLM calls: ${TOTAL} × ${MAX_TURNS} = ${TOTAL * MAX_TURNS}`);
if (DRY_RUN) console.log("DRY RUN — using mock responses, no LLM calls");

const runsFile = path.join(outDir, "runs.jsonl");
const ws = fs.createWriteStream(runsFile, { flags: "a" });

let consecutiveErrors = 0;
let completed = 0;
let aborted = false;

// Langfuse tracing (no-op unless LANGFUSE_PUBLIC_KEY/SECRET_KEY are set)
await initLangfuse();
const evalSession = path.basename(outDir);

// K workers from the run queue. Cycle the seed set ROUNDS times; each run gets
// a distinct seedValue (prime-spaced per round) so the random auto-answerer
// explores different answer paths for the same scenario across rounds.
const queue = [];
for (let r = 0; r < ROUNDS; r++) {
  for (let i = 0; i < seeds.length; i++) {
    queue.push({
      runId: r * seeds.length + i,
      seedValue: BASE_SEED + r * 10007 + i,
      description: seeds[i],
    });
  }
}

async function worker() {
  while (queue.length > 0 && !aborted) {
    const job = queue.shift();
    if (!job) break;

    try {
      const run = await traceRun(
        {
          seed: job.seedValue,
          description: job.description,
          precision: PRECISION,
          provider: provider.id,
          primaryType: routePrimaryType(job.description),
          catalogVersion,
          sessionId: evalSession,
        },
        () => runOne(job.runId, job.seedValue, job.description)
      );
      ws.write(JSON.stringify(run) + "\n");
      completed++;
      const status = run.terminationReason === "error" ? "✗" : "✓";
      console.log(`  [${completed}/${TOTAL}] ${status} seed=${job.seedValue} turns=${run.turnCount} reason=${run.terminationReason}`);

      if (run.terminationReason === "error") {
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          console.error("ABORT: 5 consecutive errors");
          aborted = true;
          break;
        }
      } else {
        consecutiveErrors = 0;
      }
    } catch (e) {
      console.error(`  [${completed}/${TOTAL}] FATAL seed=${job.seedValue}: ${e.message}`);
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        console.error("ABORT: 5 consecutive errors");
        aborted = true;
        break;
      }
    }
  }
}

await Promise.all(Array.from({ length: Math.min(WORKERS, TOTAL) }, () => worker()));
ws.end();
await shutdownLangfuse(); // flush buffered traces before exit (no-op if disabled)

console.log(`\nDone: ${completed}/${TOTAL} runs → ${runsFile}`);
console.log(`Run report: npm run eval:report -- ${outDir}`);
