/** Prototype-only debug log for the /agent-demo adaptive flow.
 *
 *  Records every step — user description, each turn's request, the model's raw
 *  tool output, the parsed decision (or why it was rejected), user submissions,
 *  and errors — so flows like "question repeated" or "no options shown" can be
 *  diagnosed from a copyable trace instead of guessing.
 *
 *  In-memory ring buffer (capped) + a tiny pub/sub so a UI panel can subscribe
 *  via useSyncExternalStore. Not persisted; cleared on reload. No main-app use. */

export type AgentLogKind =
  | "describe" // user entered a free-text intent and started
  | "request" // outgoing turn request to the model
  | "raw" // raw tool input extracted from the model response
  | "decision" // parsed, validated AgentDecision
  | "decision_invalid" // model output failed validation (id mismatch / shape)
  | "filter" // conflict/suggestion post-processing applied to options
  | "submit" // user submitted a step (picks + free text)
  | "finish" // user hit "够了，直接生成"
  | "restart"
  | "reconfigure"
  | "autofill" // auto-fill started for secondary dimensions
  | "autofill-done" // auto-fill completed
  | "autofill-error" // auto-fill failed (non-fatal)
  | "error";

export interface AgentLogEntry {
  id: number;
  t: string; // ISO timestamp
  kind: AgentLogKind;
  data?: unknown;
}

const MAX_ENTRIES = 500;
let entries: AgentLogEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Append a log entry. `data` should be small/serializable. */
export function logAgent(kind: AgentLogKind, data?: unknown): void {
  seq += 1;
  const entry: AgentLogEntry = { id: seq, t: new Date().toISOString(), kind, data };
  entries = [...entries, entry];
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  emit();
}

/** Stable snapshot for useSyncExternalStore (identity changes only on append). */
export function getAgentLog(): AgentLogEntry[] {
  return entries;
}

export function clearAgentLog(): void {
  entries = [];
  emit();
}

export function subscribeAgentLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
