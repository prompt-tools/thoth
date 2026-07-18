import { createHash } from "node:crypto";
import type { AgentHistoryItem } from "./decision";

export const RAW_CONTENT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
export const RAW_CONTENT_MAX_BYTES = 256 * 1024;

export type RawContentRoute = "fixed" | "adaptive";

interface RawContentMetadata {
  version: 1;
  journeyId: string;
  release: string;
  route: RawContentRoute;
  turn: number;
  recordedAt: number;
  expiresAt: number;
}

type DiagnosticJsonValue =
  | null
  | boolean
  | number
  | string
  | DiagnosticJsonValue[]
  | { [key: string]: DiagnosticJsonValue };

interface OpenAiDiagnosticContent {
  choices: [{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        function: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }];
}

interface AnthropicDiagnosticContent {
  stop_reason?: string | null;
  content?: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; name: string; input: DiagnosticJsonValue }
  >;
}

export type ProviderDiagnosticContent = OpenAiDiagnosticContent | AnthropicDiagnosticContent;

export type RawContentRecord =
  | (RawContentMetadata & {
      kind: "provider";
      delivery: number;
      subjectBrief: string;
      history: AgentHistoryItem[];
      providerContent: ProviderDiagnosticContent;
    })
  | (RawContentMetadata & {
      kind: "completion";
      subjectBrief: string;
      history: AgentHistoryItem[];
      finalPrompt: { zh: string; en: string };
    });

export type RawContentWriteResult = "stored" | "duplicate";

export interface RawContentStore {
  write(record: RawContentRecord): Promise<RawContentWriteResult>;
}

export interface RawContentStoreConfig {
  url: string;
  token: string;
  fetcher?: typeof fetch;
}

const KEY_PREFIX = "thoth:raw-content:v1:";
const FETCH_TIMEOUT_MS = 2_000;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function invalidRecord(): never {
  throw new Error("raw_content_record_invalid");
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function copyHistory(value: unknown): AgentHistoryItem[] {
  if (!Array.isArray(value)) invalidRecord();
  return value.map((entry) => {
    if (!isObject(entry)
      || typeof entry.questionId !== "string"
      || !Array.isArray(entry.selectedOptionIds)
      || !entry.selectedOptionIds.every((id) => typeof id === "string")
      || (entry.freeText !== undefined && typeof entry.freeText !== "string")) {
      invalidRecord();
    }
    return {
      questionId: entry.questionId,
      selectedOptionIds: [...entry.selectedOptionIds] as string[],
      ...(entry.freeText === undefined ? {} : { freeText: entry.freeText }),
    };
  });
}

function copyDiagnosticJson(value: unknown, seen = new Set<object>()): DiagnosticJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || seen.has(value)) throw new Error("invalid_diagnostic_json");
  seen.add(value);
  let copied: DiagnosticJsonValue;
  if (Array.isArray(value)) {
    copied = value.map((item) => copyDiagnosticJson(item, seen));
  } else {
    copied = Object.fromEntries(
      Object.keys(value).map((key) => [key, copyDiagnosticJson((value as Record<string, unknown>)[key], seen)]),
    );
  }
  seen.delete(value);
  return copied;
}

function unwrapProviderContent(value: unknown): unknown {
  if (!isObject(value) || value.encoding !== "base64") return value;
  if (typeof value.data !== "string"
    || value.data.length > Math.ceil(RAW_CONTENT_MAX_BYTES / 3) * 4
    || !BASE64_PATTERN.test(value.data)) {
    return undefined;
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(value.data, "base64"));
    return JSON.parse(decoded) as unknown;
  } catch {
    return undefined;
  }
}

function extractOpenAiDiagnostic(value: Record<string, unknown>): OpenAiDiagnosticContent | undefined {
  if (!Array.isArray(value.choices) || !isObject(value.choices[0])) return undefined;
  const sourceChoice = value.choices[0];
  const choice: OpenAiDiagnosticContent["choices"][0] = {};
  if (sourceChoice.finish_reason === null || typeof sourceChoice.finish_reason === "string") {
    choice.finish_reason = sourceChoice.finish_reason;
  }

  if (isObject(sourceChoice.message)) {
    const sourceMessage = sourceChoice.message;
    const message: NonNullable<OpenAiDiagnosticContent["choices"][0]["message"]> = {};
    if (sourceMessage.content === null || typeof sourceMessage.content === "string") {
      message.content = sourceMessage.content;
    }
    if (Array.isArray(sourceMessage.tool_calls)) {
      const toolCalls = sourceMessage.tool_calls.flatMap((call) => {
        if (!isObject(call) || !isObject(call.function)) return [];
        const fn: { name?: string; arguments?: string } = {};
        if (typeof call.function.name === "string") fn.name = call.function.name;
        if (typeof call.function.arguments === "string") fn.arguments = call.function.arguments;
        return Object.keys(fn).length === 0 ? [] : [{ function: fn }];
      });
      if (toolCalls.length > 0) message.tool_calls = toolCalls;
    }
    if (Object.keys(message).length > 0) choice.message = message;
  }
  return Object.keys(choice).length > 0 ? { choices: [choice] } : undefined;
}

function extractAnthropicDiagnostic(value: Record<string, unknown>): AnthropicDiagnosticContent | undefined {
  const diagnostic: AnthropicDiagnosticContent = {};
  if (value.stop_reason === null || typeof value.stop_reason === "string") {
    diagnostic.stop_reason = value.stop_reason;
  }
  if (Array.isArray(value.content)) {
    const content: NonNullable<AnthropicDiagnosticContent["content"]> = [];
    for (const block of value.content) {
      if (!isObject(block)) continue;
      if (block.type === "text" && typeof block.text === "string") {
        content.push({ type: "text", text: block.text });
        continue;
      }
      if (block.type !== "tool_use" || typeof block.name !== "string" || !("input" in block)) continue;
      try {
        content.push({
          type: "tool_use",
          name: block.name,
          input: copyDiagnosticJson(block.input),
        });
      } catch {
        // Malformed tool input is not diagnostic content.
      }
    }
    if (content.length > 0) diagnostic.content = content;
  }
  return Object.keys(diagnostic).length > 0 ? diagnostic : undefined;
}

export function extractProviderDiagnosticContent(value: unknown): ProviderDiagnosticContent | undefined {
  try {
    const unwrapped = unwrapProviderContent(value);
    if (!isObject(unwrapped)) return undefined;
    return Array.isArray(unwrapped.choices)
      ? extractOpenAiDiagnostic(unwrapped)
      : extractAnthropicDiagnostic(unwrapped);
  } catch {
    return undefined;
  }
}

function prepareRecord(input: RawContentRecord): RawContentRecord {
  if (!isObject(input)
    || input.version !== 1
    || (input.kind !== "provider" && input.kind !== "completion")
    || typeof input.journeyId !== "string"
    || !input.journeyId.trim()
    || typeof input.release !== "string"
    || !input.release.trim()
    || (input.route !== "fixed" && input.route !== "adaptive")
    || !Number.isSafeInteger(input.turn)
    || input.turn < 0
    || !isSafeTimestamp(input.recordedAt)
    || !isSafeTimestamp(input.expiresAt)
    || input.expiresAt <= input.recordedAt
    || input.expiresAt > input.recordedAt + RAW_CONTENT_RETENTION_MS
    || typeof input.subjectBrief !== "string") {
    invalidRecord();
  }

  const metadata = {
    version: 1 as const,
    journeyId: input.journeyId,
    release: input.release,
    route: input.route,
    turn: input.turn,
    recordedAt: input.recordedAt,
    expiresAt: input.expiresAt,
    subjectBrief: input.subjectBrief,
    history: copyHistory(input.history),
  };

  if (input.kind === "provider") {
    if (!Number.isSafeInteger(input.delivery) || input.delivery < 0 || !("providerContent" in input)) {
      invalidRecord();
    }
    const providerContent = extractProviderDiagnosticContent(input.providerContent);
    if (!providerContent) invalidRecord();
    return { ...metadata, kind: "provider", delivery: input.delivery, providerContent };
  }

  if (!isObject(input.finalPrompt)
    || typeof input.finalPrompt.zh !== "string"
    || typeof input.finalPrompt.en !== "string") {
    invalidRecord();
  }
  return {
    ...metadata,
    kind: "completion",
    finalPrompt: { zh: input.finalPrompt.zh, en: input.finalPrompt.en },
  };
}

function stableJson(value: unknown, seen = new Set<object>()): string {
  const normalize = (current: unknown): unknown => {
    if (current === null || typeof current === "string" || typeof current === "boolean") return current;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new Error("raw_content_record_invalid");
      return current;
    }
    if (typeof current !== "object") throw new Error("raw_content_record_invalid");
    if (seen.has(current)) throw new Error("raw_content_record_invalid");
    seen.add(current);
    let normalized: unknown;
    if (Array.isArray(current)) {
      normalized = current.map((item) => normalize(item));
    } else {
      const record = current as Record<string, unknown>;
      normalized = Object.fromEntries(
        Object.keys(record).sort().map((key) => [key, normalize(record[key])]),
      );
    }
    seen.delete(current);
    return normalized;
  };
  const serialized = JSON.stringify(normalize(value));
  if (serialized === undefined) throw new Error("raw_content_record_invalid");
  return serialized;
}

function rawContentKey(serialized: string): string {
  return `${KEY_PREFIX}${createHash("sha256").update(serialized, "utf8").digest("hex")}`;
}

export function createRawContentStore(config: RawContentStoreConfig): RawContentStore {
  const url = typeof config.url === "string" ? config.url.trim().replace(/\/+$/, "") : "";
  const token = typeof config.token === "string" ? config.token.trim() : "";
  const fetcher = config.fetcher ?? fetch;

  return {
    async write(input) {
      if (!url || !token) throw new Error("raw_content_store_unavailable");
      const record = prepareRecord(input);
      const serialized = stableJson(record);
      if (Buffer.byteLength(serialized, "utf8") > RAW_CONTENT_MAX_BYTES) {
        throw new Error("raw_content_too_large");
      }

      let response: Response;
      try {
        response = await fetcher(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify([
            "SET",
            rawContentKey(record.kind === "completion"
              ? stableJson(Object.fromEntries(
                Object.entries(record).filter(([key]) => key !== "recordedAt" && key !== "expiresAt"),
              ))
              : serialized),
            serialized,
            "NX",
            "PXAT",
            String(record.expiresAt),
          ]),
          redirect: "error",
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch {
        throw new Error("raw_content_store_unavailable");
      }
      if (!response.ok) throw new Error("raw_content_store_unavailable");

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("raw_content_store_invalid_response");
      }
      if (!isObject(payload) || !Object.prototype.hasOwnProperty.call(payload, "result")
        || Object.prototype.hasOwnProperty.call(payload, "error")) {
        throw new Error("raw_content_store_invalid_response");
      }
      if (payload.result === "OK") return "stored";
      if (payload.result === null) return "duplicate";
      throw new Error("raw_content_store_invalid_response");
    },
  };
}
