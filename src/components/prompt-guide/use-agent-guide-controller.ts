"use client";

import "@/lib/prompt/init";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderPrompt } from "@/lib/prompt/adapters";
import { imagePromptAgentWorkType } from "@/lib/prompt/work-types/image-prompt-agent.worktype";
import type { PromptSelections, RenderedPrompt } from "@/lib/prompt/types";
import { buildCatalogManifest } from "@/lib/prompt/agent/catalog-manifest";
import type { AgentDecision, AgentHistoryItem } from "@/lib/prompt/agent/decision";
import { runAgentTurn, requestAdaptiveTurn, polishPrompt, autoFillDimensions } from "@/lib/prompt/agent/client";
import { DEFAULT_PROVIDER_ID, getProvider } from "@/lib/prompt/agent/providers";
import { suggestedIdsFor } from "@/lib/prompt/agent/audit-model";
import { resolveVisibleOptions } from "@/lib/prompt/agent/options-resolver";
import { appendAnswer, selectionValueFor, buildRenderInputs, withInferredSubject } from "@/lib/prompt/agent/history";
import { clearAgentLog, logAgent, getAgentLog } from "@/lib/prompt/agent/debug-log";
import { routePrimaryType, suggestedIdsFromDescription, inferSubjectOptionIds } from "@/lib/prompt/agent/routing";
import type { Precision } from "@/lib/prompt/agent/gradient";
import { computeFillSet } from "@/lib/prompt/agent/fill";
import { portraitFillCap } from "@/lib/prompt/agent/fill-boost";

/** Flatten selection values (string | string[]) into a flat id list. */
function selectedOptionIds(selections: PromptSelections): string[] {
  return Object.values(selections).flatMap((v) => (Array.isArray(v) ? v : [v]));
}

const PROVIDER_STORAGE = "cipg.agentDemo.provider";
const keyStorageFor = (providerId: string) => `cipg.agentDemo.key.${providerId}`;

const BUILTIN_DEMO = process.env.NEXT_PUBLIC_AGENT_DEMO_BUILTIN === "1";
const ADAPTIVE_ROUTING = process.env.NEXT_PUBLIC_ADAPTIVE_ROUTING === "1";

type Phase = "needsKey" | "describe" | "asking" | "done";

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore — value still held in memory for this session
  }
}

// Safety ceiling on questions a browser session can ask. Set above the
// longest gradient active-set (detailed 人像 ≈23) so those flows finish
// naturally via remainingEmpty rather than getting cut; only fires as a guard
// against a never-terminating bug.
const H3_MAX_TURNS = 28;

async function runSecondaryAutofill(args: {
  history: AgentHistoryItem[];
  manifest: ReturnType<typeof buildCatalogManifest>;
  description: string;
  precision: Precision;
  providerId: string;
  apiKey: string;
}): Promise<{ filledHistory: AgentHistoryItem[]; filledIds: Set<string> }> {
  let filledHistory = args.history;
  const filledIds = new Set<string>();
  if (args.precision === "detailed") return { filledHistory, filledIds };

  const type = routePrimaryType(args.description);
  const fillCap = portraitFillCap(type);
  const fillSet = computeFillSet(
    type,
    args.history,
    args.manifest,
    fillCap,
    undefined,
    args.description,
  );
  if (fillSet.length === 0) return { filledHistory, filledIds };

  logAgent("autofill", { fillSet, type, precision: args.precision });
  try {
    const fillResults = await autoFillDimensions(
      getProvider(args.providerId),
      args.apiKey,
      {
        manifest: args.manifest,
        history: args.history,
        fillSet,
        userDescription: args.description,
      },
    );
    for (const r of fillResults) {
      filledHistory = appendAnswer(filledHistory, r.questionId, r.selectedOptionIds);
      filledIds.add(r.questionId);
    }
    logAgent("autofill-done", {
      filledDimensions: [...filledIds],
      fillCount: fillResults.length,
    });
  } catch {
    logAgent("autofill-error", { fillSet });
  }
  return { filledHistory, filledIds };
}

/** Controller for the BYOK, multi-provider agent prototype. The agent picks the
 *  next dimension + narrowed options each turn (via /api/llm proxy); the final
 *  prompt is stitched deterministically over the canonical worktype. */
export function useAgentGuideController() {
  const manifest = useMemo(() => buildCatalogManifest(), []);

  // Deterministic defaults so SSR and the first client render produce identical
  // HTML — reading localStorage during init caused a hydration mismatch
  // (server has no key → "needsKey"; client had a key → "describe"). Real
  // values are hydrated in an effect after mount (below).
  const [providerId, setProviderId] = useState<string>(DEFAULT_PROVIDER_ID);
  const [apiKey, setApiKey] = useState<string>("");
  const [phase, setPhase] = useState<Phase>(BUILTIN_DEMO ? "describe" : "needsKey");

  const [description, setDescription] = useState("");
  const descriptionRef = useRef("");
  descriptionRef.current = description;

  // C-9c: precision state
  const [precision, setPrecision] = useState<Precision>("simple");
  const precisionRef = useRef<Precision>("simple");
  precisionRef.current = precision;

  // C-9c: primaryType for display
  const [primaryType, setPrimaryType] = useState<string>("通用");

  const [history, setHistory] = useState<AgentHistoryItem[]>([]);
  const [selections, setSelections] = useState<PromptSelections>({});
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [decisionSource, setDecisionSource] = useState<"model" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);

  // A5: track which dimensions were auto-filled (for Pass B UI)
  const [autoFilledQuestionIds, setAutoFilledQuestionIds] = useState<Set<string>>(new Set());

  const [polished, setPolished] = useState<{ zh: string; en: string } | null>(null);
  const [polishing, setPolishing] = useState(false);

  const [draft, setDraft] = useState<string[]>([]);
  // Per-question free-text escape hatch (overrides option picks for that dim).
  const [draftText, setDraftText] = useState("");
  // freeTexts value is derived from history at render time (buildRenderInputs);
  // only the setter is kept to record per-question free-text into state flow.
  const [, setFreeTexts] = useState<Record<string, string>>({});

  // Refs so async callbacks read the live provider/key without stale closures.
  const providerRef = useRef(providerId);
  providerRef.current = providerId;
  const keyRef = useRef(apiKey);
  keyRef.current = apiKey;
  // Monotonic turn id — lets us discard responses from superseded fetches.
  const sessionRef = useRef(0);
  // Stable id for the whole describe→done journey (telemetry trace key).
  const sessionIdRef = useRef("");
  // Server-signed proof of the Ask whose answer may advance Adaptive history.
  const turnTokenRef = useRef("");

  /** Fire-and-forget telemetry: persist this session's full step log (presented option ids
   *  + user selections + auto-fills + final prompt) to /api/telemetry → Langfuse. Uses
   *  sendBeacon so it survives page unload (captures abandonment). Never throws. */
  const flushTelemetry = useCallback((endedReason: string, finalPrompt?: { zh: string; en: string }) => {
    if (!telemetryEnabled || !sessionIdRef.current) return;
    try {
      const body = JSON.stringify({
        sessionId: sessionIdRef.current,
        seed: descriptionRef.current,
        primaryType: routePrimaryType(descriptionRef.current),
        precision: precisionRef.current,
        finalPrompt: finalPrompt ?? null,
        endedReason,
        entries: getAgentLog(),
      });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/telemetry", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
      }
    } catch {
      /* telemetry must never break the user's flow */
    }
  }, [telemetryEnabled]);

  // Hydrate provider/key from localStorage once, after mount. Keeping this out
  // of the initial useState avoids the SSR hydration mismatch; the gate may
  // flash for one frame before jumping to "describe" when a key is stored.
  useEffect(() => {
    // Built-in demo mode (public deploy): skip the BYOK gate. Use deepseek with a sentinel
    // key; the /api/llm server route injects the real server-side key. The real key is never
    // in the browser.
    if (BUILTIN_DEMO) {
      setProviderId("deepseek");
      providerRef.current = "deepseek";
      keyRef.current = "__demo__";
      setApiKey("__demo__");
      setPhase("describe");
      return;
    }
    const savedProvider = readStorage(PROVIDER_STORAGE) || DEFAULT_PROVIDER_ID;
    const savedKey = readStorage(keyStorageFor(savedProvider));
    if (savedProvider !== DEFAULT_PROVIDER_ID) setProviderId(savedProvider);
    if (savedKey) {
      setApiKey(savedKey);
      providerRef.current = savedProvider;
      keyRef.current = savedKey;
      setPhase("describe");
    }
  }, []);

  const provider = useMemo(() => getProvider(providerId), [providerId]);

  // A0: render from history (single source of truth) to eliminate drift
  // between UI and eval harness. selections/freeTexts state kept for
  // conflict filtering + suggested badges but NOT used for final render.
  const rendered: RenderedPrompt | null = useMemo(() => {
    if (phase !== "done") return null;
    const { selections: sel, freeTexts: ft } = buildRenderInputs(
      withInferredSubject(history, description, primaryType),
      manifest,
    );
    return renderPrompt({
      workType: imagePromptAgentWorkType,
      // Seed-anchor: carry the user's original request so subject identity (occupation,
      // "a couple", "twins") survives even when no catalog option represents it — the
      // dominant remaining adaptive-loss cause (autofill-seed-blind finding).
      rawIntent: description,
      selections: sel,
      freeTexts: ft,
    });
  }, [phase, history, manifest, description, primaryType]);

  // Telemetry: when a session completes, persist the full journey + the final prompt.
  useEffect(() => {
    if (phase === "done" && rendered) {
      flushTelemetry("done", { zh: rendered.zhPrompt, en: rendered.enPrompt });
    }
  }, [phase, rendered, flushTelemetry]);

  // B1: derive a display-friendly summary of auto-filled dimensions
  const autoFilledSummary = useMemo(() => {
    if (autoFilledQuestionIds.size === 0) return [];
    const manifestMap = new Map(manifest.map((d) => [d.questionId, d]));
    const out: Array<{ questionId: string; title: string; picks: string[] }> = [];
    for (const qid of autoFilledQuestionIds) {
      const hist = history.find((h) => h.questionId === qid);
      if (!hist) continue;
      const dim = manifestMap.get(qid);
      const title = dim?.title ?? qid;
      const picks = hist.selectedOptionIds
        .map((id) => dim?.options.find((o) => o.id === id)?.label ?? id);
      if (picks.length === 0) continue;
      out.push({ questionId: qid, title, picks });
    }
    return out;
  }, [autoFilledQuestionIds, history, manifest]);

  // Consecutive fallback counter — persisted across fetchNext calls within a session
  const consecutiveFallbackRef = useRef(0);

  const fetchNext = useCallback(
    async (nextHistory: AgentHistoryItem[]) => {
      // Claim this turn; any in-flight request from a prior session is voided
      // so a late response can't yank the UI back into "asking" after a
      // restart / reconfigure / provider switch.
      const mySession = ++sessionRef.current;
      setLoading(true);
      setError(null);
      setDecision(null);
      setDecisionSource(null);

      // H3: browser-side safety ceiling
      if (!ADAPTIVE_ROUTING && nextHistory.length >= H3_MAX_TURNS) {
        logAgent("decision", { done: true, reason: "h3_ceiling", turns: nextHistory.length });
        setPhase("done");
        setLoading(false);
        return;
      }

      try {
        const turnResult = ADAPTIVE_ROUTING
          ? await requestAdaptiveTurn(keyRef.current, {
              subjectBrief: descriptionRef.current,
              history: nextHistory,
              precision: precisionRef.current,
              ...(turnTokenRef.current ? { turnToken: turnTokenRef.current } : {}),
            })
          : await runAgentTurn(
              getProvider(providerRef.current),
              keyRef.current,
              {
                manifest,
                history: nextHistory,
                userDescription: descriptionRef.current,
                precision: precisionRef.current,
              }
            );
        const { decision: next, diagnostics } = turnResult;
        if (sessionRef.current !== mySession) return; // superseded
        if (ADAPTIVE_ROUTING) {
          turnTokenRef.current = "turnToken" in turnResult && typeof turnResult.turnToken === "string"
            ? turnResult.turnToken
            : "";
        }

        // Track consecutive fallbacks — if ≥ 2, stop dragging and end
        const fallbackUsed = "fallbackUsed" in diagnostics
          ? diagnostics.fallbackUsed
          : diagnostics.source === "fallback";
        if (fallbackUsed) {
          consecutiveFallbackRef.current++;
        } else {
          consecutiveFallbackRef.current = 0;
        }
        if (!ADAPTIVE_ROUTING && consecutiveFallbackRef.current >= 2) {
          // Intentionally skip setDecision(next) — the UI transitions to "done"
          // phase which renders the stitched prompt from existing selections.
          logAgent("decision", {
            nextQuestionId: next.nextQuestionId,
            visibleOptionIds: next.visibleOptionIds,
            done: true,
            reason: "fallbackGiveUp",
            consecutiveFallbacks: consecutiveFallbackRef.current,
          });
          setPhase("done");
          return;
        }
        setDecisionSource(fallbackUsed ? "fallback" : "model");

        if (!ADAPTIVE_ROUTING && next.done && nextHistory.length === 0) {
          // Model ended before asking anything — nothing to stitch.
          setError("AI 没有给出任何问题，请点重试或换一种描述。");
          return;
        }

        if (next.done) {
          const { filledHistory, filledIds } = ADAPTIVE_ROUTING
            ? { filledHistory: nextHistory, filledIds: new Set<string>() }
            : await runSecondaryAutofill({
                history: nextHistory,
                manifest,
                description: descriptionRef.current,
                precision: precisionRef.current,
                providerId: providerRef.current,
                apiKey: keyRef.current,
              });
          if (sessionRef.current !== mySession) return;

          // H2: empty prompt guard (now on filledHistory)
          const { selections: sel, freeTexts: ft } = buildRenderInputs(
            withInferredSubject(filledHistory, descriptionRef.current, primaryType),
            manifest,
          );
          if (!ADAPTIVE_ROUTING && Object.keys(sel).length === 0 && Object.keys(ft).length === 0) {
            setError("还没选任何内容，请至少选几项或换个描述");
            return;
          }

          setAutoFilledQuestionIds(filledIds);
          setHistory(filledHistory);

          // Update selections/freeTexts state from filled history for conflict filtering
          setSelections(sel);
          setFreeTexts(ft);

          setDecision(next);
          setPhase("done");
        } else {
          // Render the question. Without this the not-done path left `decision` null →
          // `currentDimension` null → the UI sat forever on "AI 正在决定下一步"
          // (surfaced by the first real-human walkthrough of /agent-demo).
          setDecision(next);
          setDraft([]);
          setDraftText("");
          setPhase("asking");
        }
      } catch (e) {
        if (sessionRef.current !== mySession) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (sessionRef.current === mySession) setLoading(false);
      }
    },
    [manifest, primaryType]
  );

  const saveKeyAndStart = useCallback(
    (nextProviderId: string, key: string) => {
      const trimmed = key.trim();
      if (!trimmed) return;
      writeStorage(PROVIDER_STORAGE, nextProviderId);
      writeStorage(keyStorageFor(nextProviderId), trimmed);
      setProviderId(nextProviderId);
      setApiKey(trimmed);
      providerRef.current = nextProviderId;
      keyRef.current = trimmed;
      setHistory([]);
      setSelections({});
      setDecision(null);
      setDecisionSource(null);
      setDraft([]);
      setDraftText("");
      setFreeTexts({});
      setPolished(null);
      setDescription("");
      descriptionRef.current = "";
      setPrecision("simple");
      setAutoFilledQuestionIds(new Set());
      setTelemetryEnabled(false);
      precisionRef.current = "simple";
      sessionRef.current++; // void any in-flight fetch from a prior session
      consecutiveFallbackRef.current = 0;
      turnTokenRef.current = "";
      // Collect a free-text description first; the agent routes from it.
      setPhase("describe");
    },
    []
  );

  /** Leave the describe step (with or without text) and ask the first question. */
  const startWithDescription = useCallback(
    (text: string) => {
      if (ADAPTIVE_ROUTING && !text.trim()) {
        setError("请先描述你想要的人物或角色。");
        return;
      }
      setDescription(text);
      descriptionRef.current = text;
      // C-9c: route primary type for display
      setPrimaryType(routePrimaryType(text));
      setHistory([]);
      setSelections({});
      setDecision(null);
      setDecisionSource(null);
      setDraft([]);
      setDraftText("");
      setFreeTexts({});
      setPolished(null);
      setError(null);
      setAutoFilledQuestionIds(new Set());
      clearAgentLog();
      turnTokenRef.current = "";
      sessionIdRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
      logAgent("describe", { text: text.trim() || "(空，直接开始)", primaryType: routePrimaryType(text) });
      setPhase("asking");
      void fetchNext([]);
    },
    [fetchNext]
  );

  const currentDimension = useMemo(
    () =>
      decision ? manifest.find((d) => d.questionId === decision.nextQuestionId) ?? null : null,
    [decision, manifest]
  );

  const visibleOptions = useMemo(() => {
    if (!decision || !currentDimension) return [];
    if (ADAPTIVE_ROUTING) {
      return decision.visibleOptionIds
        .map((id) => currentDimension.options.find((option) => option.id === id))
        .filter((option): option is NonNullable<typeof option> => Boolean(option));
    }
    const { visible } = resolveVisibleOptions(
      currentDimension,
      decision.visibleOptionIds,
      selectedOptionIds(selections),
    );
    return visible;
  }, [decision, currentDimension, selections]);

  // Options recommended by the audit associations given prior picks ("推荐" badge).
  // On the subject question (first turn), also derive suggestions from the description
  // text so portrait subject types get a badge even before any selection is made.
  const suggestedIds = useMemo(() => {
    const fromSelections = suggestedIdsFor(selectedOptionIds(selections));
    if (decision?.nextQuestionId === "subject") {
      const fromDesc = suggestedIdsFromDescription(description, primaryType);
      if (fromDesc.size > 0) return new Set([...fromSelections, ...fromDesc]);
    }
    return fromSelections;
  }, [selections, decision, description, primaryType]);

  // Log what's actually shown for each decision, incl. options the hard-conflict
  // filter removed — pinpoints "no options shown" without guessing.
  useEffect(() => {
    if (phase !== "asking" || !decision || !currentDimension) return;
    const { conflictDropped } = resolveVisibleOptions(
      currentDimension,
      decision.visibleOptionIds,
      selectedOptionIds(selections),
    );
    logAgent("filter", {
      questionId: decision.nextQuestionId,
      shownOptionIds: visibleOptions.map((o) => o.id),
      shownCount: visibleOptions.length,
      conflictDropped: conflictDropped.length > 0 ? conflictDropped : undefined,
      suggested: [...suggestedIds].filter((id) =>
        visibleOptions.some((o) => o.id === id)
      ),
    });
    // Log once per decision; other refs are read as a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision]);

  const toggleDraft = useCallback(
    (optionId: string) => {
      if (!currentDimension) return;
      if (currentDimension.mode === "single") {
        setDraft((prev) => (prev[0] === optionId ? [] : [optionId]));
      } else {
        setDraft((prev) =>
          prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
        );
      }
    },
    [currentDimension]
  );

  const submitStep = useCallback(() => {
    if (!decision || !currentDimension) return;
    const text = draftText.trim();
    if (draft.length === 0 && !text) return;
    const questionId = decision.nextQuestionId;
    if (!questionId) return;
    let picked = draft;
    if (questionId === "subject" && picked.length === 0) {
      picked = inferSubjectOptionIds(descriptionRef.current, primaryType);
    }
    const nextHistory = appendAnswer(history, questionId, picked, text || undefined);
    logAgent("submit", { questionId, selectedOptionIds: picked, freeText: text || undefined });
    if (picked.length > 0) {
      const value = selectionValueFor(currentDimension.mode, picked);
      if (value !== undefined) {
        setSelections((prev) => ({ ...prev, [questionId]: value }));
      }
    }
    setFreeTexts((prev) => {
      const next = { ...prev };
      if (text) next[questionId] = text;
      else delete next[questionId];
      return next;
    });
    setHistory(nextHistory);
    flushTelemetry("submit"); // checkpoint each answer (captures abandonment too)
    void fetchNext(nextHistory);
  }, [decision, currentDimension, draft, draftText, history, fetchNext, flushTelemetry, primaryType]);

  const skipStep = useCallback(() => {
    if (!decision || !currentDimension) return;
    const questionId = decision.nextQuestionId;
    if (!questionId) return;
    const picked =
      questionId === "subject"
        ? inferSubjectOptionIds(descriptionRef.current, primaryType)
        : [];
    logAgent("submit", { questionId, skipped: true, inferredSubjectIds: picked.length ? picked : undefined });
    const nextHistory = appendAnswer(history, questionId, picked);
    if (picked.length > 0) {
      const value = selectionValueFor(currentDimension.mode, picked);
      if (value !== undefined) {
        setSelections((prev) => ({ ...prev, [questionId]: value }));
      }
    }
    setHistory(nextHistory);
    setDraft([]);
    setDraftText("");
    flushTelemetry("skip");
    void fetchNext(nextHistory);
  }, [decision, currentDimension, history, fetchNext, flushTelemetry, primaryType]);

  const finishNow = useCallback(async () => {
    // Nothing to stitch if the user hasn't answered anything yet.
    if (history.length === 0) return;
    const mySession = ++sessionRef.current;
    logAgent("finish", { askedSoFar: history.map((h) => h.questionId) });

    const { filledHistory, filledIds } = await runSecondaryAutofill({
      history,
      manifest,
      description: descriptionRef.current,
      precision: precisionRef.current,
      providerId: providerRef.current,
      apiKey: keyRef.current,
    });
    if (sessionRef.current !== mySession) return;

    setAutoFilledQuestionIds(filledIds);
    setHistory(filledHistory);
    const { selections: sel, freeTexts: ft } = buildRenderInputs(
      withInferredSubject(filledHistory, descriptionRef.current, primaryType),
      manifest,
    );
    setSelections(sel);
    setFreeTexts(ft);
    setPhase("done");
  }, [history, manifest, primaryType]);

  const polish = useCallback(async () => {
    if (!rendered) return;
    setPolishing(true);
    setError(null);
    try {
      const result = await polishPrompt(getProvider(providerRef.current), keyRef.current, {
        zhPrompt: rendered.zhPrompt,
        enPrompt: rendered.enPrompt,
      });
      setPolished(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPolishing(false);
    }
  }, [rendered]);

  const restart = useCallback(() => {
    setHistory([]);
    setSelections({});
    setDecision(null);
    setDraft([]);
    setDraftText("");
    setFreeTexts({});
    setPolished(null);
    setError(null);
    setDescription("");
    descriptionRef.current = "";
    setPrecision("simple");
    precisionRef.current = "simple";
    setAutoFilledQuestionIds(new Set());
    setTelemetryEnabled(false);
    sessionRef.current++; // void any in-flight fetch
    consecutiveFallbackRef.current = 0;
    turnTokenRef.current = "";
    logAgent("restart");
    // Back to the description step so the user can restate their goal.
    setPhase("describe");
  }, []);

  const retryStep = useCallback(() => {
    void fetchNext(history);
  }, [history, fetchNext]);

  /** Return to the key/provider gate to switch provider or re-enter a key. */
  const reconfigure = useCallback(() => {
    sessionRef.current++; // void any in-flight fetch
    logAgent("reconfigure");
    if (BUILTIN_DEMO) return;
    setPhase("needsKey");
  }, []);

  return {
    providerId,
    provider,
    apiKey,
    phase,
    loading,
    error,
    history,
    decision,
    decisionSource,
    currentDimension,
    visibleOptions,
    suggestedIds,
    draft,
    draftText,
    setDraftText,
    rendered,
    polished,
    polishing,
    manifest,
    description,
    precision,
    setPrecision: (p: Precision) => { precisionRef.current = p; setPrecision(p); },
    primaryType,
    telemetryEnabled,
    setTelemetryEnabled,
    builtinDemo: BUILTIN_DEMO,
    adaptiveRouting: ADAPTIVE_ROUTING,
    readKeyFor: (id: string) => readStorage(keyStorageFor(id)),
    saveKeyAndStart,
    startWithDescription,
    toggleDraft,
    submitStep,
    skipStep,
    finishNow,
    polish,
    restart,
    retryStep,
    reconfigure,
    autoFilledQuestionIds,
    autoFilledSummary,
  };
}
