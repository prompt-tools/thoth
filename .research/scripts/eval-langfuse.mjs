/**
 * Env-gated Langfuse tracing for the eval harness (server-side, has secret key).
 * Follows the Langfuse v5 OTel-native SDK (@langfuse/otel + @langfuse/tracing +
 * @langfuse/client), per the official "langfuse" skill (instrumentation.md).
 *
 * No-op unless BOTH LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set, so the
 * harness runs identically without Langfuse. All Langfuse calls are wrapped in
 * try/catch — a misconfig or API drift must NEVER break an eval run.
 *
 * Baseline instrumentation (skill: "baseline first, then explore, then add"):
 *   one trace per eval run, with input (seed/precision), output (final prompt),
 *   metadata (type/turns/auto-fill), and best-effort scores. Per-turn
 *   generations are a follow-up after exploring baseline traces in the UI.
 *
 * Env:
 *   LANGFUSE_PUBLIC_KEY=pk-lf-...
 *   LANGFUSE_SECRET_KEY=sk-lf-...
 *   LANGFUSE_BASE_URL=http://localhost:3100   (self-host) | https://cloud.langfuse.com
 */

let enabled = false;
let sdk = null;
let client = null;
let T = null; // @langfuse/tracing module

// Optional dataset-run linkage (gated by LANGFUSE_DATASET env). When set, each
// eval run links its trace to the matching dataset item under a named run, so
// the Datasets → Runs view can compare the same seed across runs.
let datasetItemsByInput = null; // Map<descriptionString, datasetItem>
let datasetRunName = null;

export async function initLangfuse() {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return false;
  }
  try {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { LangfuseSpanProcessor } = await import("@langfuse/otel");
    const { LangfuseClient } = await import("@langfuse/client");
    T = await import("@langfuse/tracing");
    sdk = new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] });
    sdk.start();
    client = new LangfuseClient();
    enabled = true;
    const host = process.env.LANGFUSE_BASE_URL || "(default cloud)";
    console.log(`[langfuse] tracing enabled → ${host}`);
    await loadDatasetForLinking();
    return true;
  } catch (e) {
    console.warn("[langfuse] init failed, tracing disabled:", e?.message ?? e);
    enabled = false;
    return false;
  }
}

export function langfuseEnabled() {
  return enabled;
}

/** If LANGFUSE_DATASET is set, fetch that dataset once and index its items by
 *  their input description, so traceRun can link each run to its seed item
 *  under a named run. Best-effort — failure just disables linkage. */
async function loadDatasetForLinking() {
  const name = process.env.LANGFUSE_DATASET;
  if (!name) return;
  // Guard against SDK API drift (same reason langfuse-dataset.mjs uses REST):
  // if this build lacks client.dataset.get, disable linkage cleanly.
  if (typeof client?.dataset?.get !== "function") {
    console.warn("[langfuse] client.dataset.get unavailable, linkage disabled");
    return;
  }
  try {
    const dataset = await client.dataset.get(name);
    datasetItemsByInput = new Map();
    for (const item of dataset.items ?? []) {
      // Items were created with input { description }. Key by that string.
      const desc =
        typeof item.input === "object" && item.input ? item.input.description : item.input;
      if (typeof desc === "string") datasetItemsByInput.set(desc, item);
    }
    datasetRunName =
      process.env.LANGFUSE_DATASET_RUN || `eval-${new Date().toISOString().slice(0, 19)}`;
    console.log(
      `[langfuse] dataset linkage on: "${name}" (${datasetItemsByInput.size} items) → run "${datasetRunName}"`
    );
  } catch (e) {
    console.warn("[langfuse] dataset load failed, linkage disabled:", e?.message ?? e);
    datasetItemsByInput = null;
  }
}

/**
 * Emit one child generation observation per agent turn under the active run
 * span. Each turn already carries model-decision IO + latency + (now) token
 * usage in the harness record, so we replay them as a proper generation tree:
 * model name + usageDetails enable per-turn cost calc and model analytics in
 * the Langfuse UI. Best-effort — a bad turn record must never break the run.
 */
function emitTurnGenerations(span, run) {
  if (!Array.isArray(run?.turns)) return;
  for (const t of run.turns) {
    try {
      const usage = t.diagnostics?.usage;
      const gen = span.startObservation(
        `turn-${t.turnIndex}`,
        {
          model: run.routingModel,
          input: { tier: t.tier, offeredDimensionIds: t.offeredDimensionIds },
          output: {
            nextQuestionId: t.nextQuestionId,
            visibleOptionIds: t.decisionVisibleOptionIds,
            shownOptionIds: t.shownOptionIds,
            answer: t.answer,
            done: t.answer?.kind === "done",
            error: t.error,
          },
          // Langfuse maps the canonical `input`/`output` usage keys to model
          // pricing for automatic cost calc; custom keys (promptTokens/…) would
          // be stored but never priced.
          ...(usage
            ? {
                usageDetails: {
                  ...(usage.promptTokens != null ? { input: usage.promptTokens } : {}),
                  ...(usage.completionTokens != null ? { output: usage.completionTokens } : {}),
                },
              }
            : {}),
          metadata: {
            latencyMs: t.latencyMs,
            source: t.diagnostics?.source,
            fallbackUsed: t.diagnostics?.fallbackUsed,
            attempts: t.diagnostics?.attempts,
            repeatedDimension: t.repeatedDimension,
          },
          level: t.error ? "ERROR" : "DEFAULT",
        },
        { asType: "generation" }
      );
      gen.end();
    } catch {
      /* per-turn generation is best-effort */
    }
  }
}

/**
 * Wrap one eval run in a Langfuse trace. `fn()` must return the run record.
 * Captures trace-level sessionId + tags (via propagateAttributes), run
 * input/output/metadata, per-turn generations, and best-effort scores.
 * Returns the run record.
 */
export async function traceRun(meta, fn) {
  if (!enabled) return fn();

  // Trace-level grouping: sessionId clusters one eval batch in the Sessions
  // view; tags make precision/provider/type filterable across runs.
  const tags = ["agent-eval"];
  if (meta.precision) tags.push(`precision:${meta.precision}`);
  if (meta.provider) tags.push(`provider:${meta.provider}`);
  if (meta.primaryType) tags.push(`type:${meta.primaryType}`);

  const runTraced = () =>
    T.startActiveObservation("agent-eval-run", async (span) => {
      try {
        span.update({
          input: { seed: meta.seed, description: meta.description, precision: meta.precision },
        });
      } catch {
        /* attribute set best-effort */
      }

      let run;
      try {
        run = await fn();
      } catch (e) {
        try {
          span.update({ level: "ERROR", statusMessage: String(e?.message ?? e) });
        } catch {
          /* ignore */
        }
        throw e;
      }

      // Per-turn generation tree (model + tokens + IO).
      emitTurnGenerations(span, run);

      const autoFilledCount = (run.autoFilledDimensions ?? []).length;
      const finalEmpty = run.finalPrompt?.zhEmpty && run.finalPrompt?.enEmpty ? 1 : 0;

      try {
        span.update({
          output: {
            zh: run.finalPrompt?.zh,
            en: run.finalPrompt?.en,
            terminationReason: run.terminationReason,
          },
          metadata: {
            primaryType: run.primaryType,
            precision: run.precision ?? meta.precision,
            turnCount: run.turnCount,
            autoFilledCount,
            catalogVersion: meta.catalogVersion,
            sessionId: meta.sessionId,
          },
        });
      } catch {
        /* ignore */
      }

      // Best-effort scores (compare runs over time in the Langfuse UI).
      try {
        const traceId = span?.traceId;
        if (traceId && client?.score?.create) {
          await client.score.create({ traceId, name: "turnCount", value: run.turnCount ?? 0 });
          await client.score.create({ traceId, name: "autoFilledCount", value: autoFilledCount });
          await client.score.create({ traceId, name: "finalPromptEmpty", value: finalEmpty });
        }
      } catch {
        /* scores are best-effort */
      }

      // Dataset-run linkage (best-effort): connect this trace to its seed item
      // under the named run, enabling the Datasets → Runs comparison view.
      if (datasetItemsByInput && datasetRunName) {
        try {
          const item = datasetItemsByInput.get(meta.description);
          if (item?.link) await item.link(span, datasetRunName);
        } catch (e) {
          console.warn("[langfuse] dataset link failed:", e?.message ?? e);
        }
      }

      return run;
    });

  try {
    // propagateAttributes sets trace-level sessionId/tags for everything in scope.
    return await T.propagateAttributes({ sessionId: meta.sessionId, tags }, runTraced);
  } catch (e) {
    // If the tracing wrapper itself throws, fall back to running untraced.
    console.warn("[langfuse] traceRun wrapper failed, running untraced:", e?.message ?? e);
    return fn();
  }
}

/** Flush traces (OTel SDK) AND scores (client ScoreManager has its own buffer),
 *  then shut down. MUST be called before the script exits or data is lost. */
export async function shutdownLangfuse() {
  // Scores live in a separate buffer from spans — flush both.
  try {
    await client?.score?.flush?.();
  } catch (e) {
    console.warn("[langfuse] score flush failed:", e?.message ?? e);
  }
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch (e) {
    console.warn("[langfuse] shutdown failed:", e?.message ?? e);
  }
}
