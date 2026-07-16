import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AgentHistoryItem } from "./decision";

interface AcceptedAskState {
  version: 1;
  subjectHash: string;
  historyHash: string;
  questionId: string;
  optionIds: string[];
  mode: "single" | "multi" | "free_text";
  maxSelections?: number;
  expiresAt: number;
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function historyDigest(history: AgentHistoryItem[]): string {
  return digest(JSON.stringify(history));
}

function signature(secret: string, encodedPayload: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest();
}

export function issueAcceptedAskToken(args: {
  secret: string;
  subjectBrief: string;
  history: AgentHistoryItem[];
  questionId: string;
  optionIds: string[];
  mode: "single" | "multi" | "free_text";
  maxSelections?: number;
  now?: number;
}): string {
  const payload: AcceptedAskState = {
    version: 1,
    subjectHash: digest(args.subjectBrief.trim()),
    historyHash: historyDigest(args.history),
    questionId: args.questionId,
    optionIds: args.optionIds,
    mode: args.mode,
    ...(args.maxSelections === undefined ? {} : { maxSelections: args.maxSelections }),
    expiresAt: (args.now ?? Date.now()) + 30 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${signature(args.secret, encodedPayload).toString("base64url")}`;
}

function isHistory(value: unknown): value is AgentHistoryItem[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const item = entry as Record<string, unknown>;
    return typeof item.questionId === "string"
      && Array.isArray(item.selectedOptionIds)
      && item.selectedOptionIds.every((id) => typeof id === "string")
      && (item.freeText === undefined || typeof item.freeText === "string");
  });
}

export function verifySubmittedTurnState(secret: string, input: unknown, now = Date.now()): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_turn_state");
  const raw = input as Record<string, unknown>;
  if (typeof raw.subjectBrief !== "string" || !isHistory(raw.history)) throw new Error("invalid_turn_state");
  if (raw.history.length === 0) {
    if (raw.turnToken !== undefined) throw new Error("invalid_turn_state");
    return;
  }
  if (typeof raw.turnToken !== "string") throw new Error("invalid_turn_state");
  const [encodedPayload, encodedSignature, extra] = raw.turnToken.split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) throw new Error("invalid_turn_state");
  const actual = Buffer.from(encodedSignature, "base64url");
  const expected = signature(secret, encodedPayload);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("invalid_turn_state");

  let payload: AcceptedAskState;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AcceptedAskState;
  } catch {
    throw new Error("invalid_turn_state");
  }
  if (payload.version !== 1 || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= now) {
    throw new Error("invalid_turn_state");
  }
  const answer = raw.history.at(-1)!;
  const prefix = raw.history.slice(0, -1);
  const uniqueOptionIds = new Set(answer.selectedOptionIds);
  const hasFreeText = answer.freeText !== undefined;
  if (uniqueOptionIds.size !== answer.selectedOptionIds.length
    || (hasFreeText && !answer.freeText?.trim())
    || (hasFreeText && answer.selectedOptionIds.length > 0)
    || (payload.mode === "single" && answer.selectedOptionIds.length > 1)
    || (payload.maxSelections !== undefined && answer.selectedOptionIds.length > payload.maxSelections)) {
    throw new Error("invalid_turn_state");
  }
  if (payload.subjectHash !== digest(raw.subjectBrief.trim())
    || payload.historyHash !== historyDigest(prefix)
    || payload.questionId !== answer.questionId
    || !Array.isArray(payload.optionIds)
    || !["single", "multi", "free_text"].includes(payload.mode)
    || answer.selectedOptionIds.some((id) => !payload.optionIds.includes(id))) {
    throw new Error("invalid_turn_state");
  }
}
