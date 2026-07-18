import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AgentHistoryItem } from "./decision";
import {
  RAW_CONTENT_MAX_BYTES,
  RAW_CONTENT_RETENTION_MS,
  createRawContentStore,
  extractProviderDiagnosticContent,
  type ProviderDiagnosticContent,
  type RawContentRecord,
} from "./raw-content-store";

const NOW = 1_700_000_000_000;
const history: AgentHistoryItem[] = [
  { questionId: "image-pose", selectedOptionIds: ["standing"], freeText: "自然站姿" },
];

const openAiResponse = {
  id: "chatcmpl-secret-id",
  model: "deepseek-chat",
  created: 1_700_000_000,
  system_fingerprint: "fp-secret",
  headers: { authorization: "Bearer provider-secret" },
  usage: { prompt_tokens: 123, completion_tokens: 45 },
  choices: [{
    index: 0,
    finish_reason: "tool_calls",
    logprobs: { should: "drop" },
    message: {
      role: "assistant",
      content: "保留 OpenAI 文本",
      refusal: null,
      tool_calls: [{
        id: "call-secret-id",
        type: "function",
        function: {
          name: "decide_adaptive_turn",
          arguments: " {\"questionId\":\"image-pose\",\"note\":\"原样保留\"} ",
          provider_metadata: "drop",
        },
      }],
    },
  }],
};

const openAiDiagnostic: ProviderDiagnosticContent = {
  choices: [{
    finish_reason: "tool_calls",
    message: {
      content: "保留 OpenAI 文本",
      tool_calls: [{
        function: {
          name: "decide_adaptive_turn",
          arguments: " {\"questionId\":\"image-pose\",\"note\":\"原样保留\"} ",
        },
      }],
    },
  }],
};

const providerRecord: RawContentRecord = {
  version: 1,
  kind: "provider",
  delivery: 0,
  journeyId: "journey-1",
  release: "release-a",
  route: "adaptive",
  turn: 2,
  recordedAt: NOW,
  expiresAt: NOW + RAW_CONTENT_RETENTION_MS,
  subjectBrief: "雨夜女侦探",
  history,
  providerContent: openAiDiagnostic,
};

const completionRecord: RawContentRecord = {
  version: 1,
  kind: "completion",
  journeyId: "journey-1",
  release: "release-a",
  route: "adaptive",
  turn: 3,
  recordedAt: NOW,
  expiresAt: NOW + RAW_CONTENT_RETENTION_MS,
  subjectBrief: "雨夜女侦探",
  history,
  finalPrompt: { zh: "雨夜女侦探，电影感", en: "a cinematic rainy-night detective" },
};

type StoredValue = { value: string; expiresAt: number };

function fakeRedis(now: () => number) {
  const values = new Map<string, StoredValue>();
  const sweep = () => {
    for (const [storedKey, stored] of values) {
      if (stored.expiresAt <= now()) values.delete(storedKey);
    }
  };
  const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as string[];
    expect(command[0]).toBe("SET");
    const [, key, value, nx, pxat, expiresAt] = command;
    expect(nx).toBe("NX");
    expect(pxat).toBe("PXAT");
    sweep();
    if (values.has(key)) return Response.json({ result: null });
    if (Number(expiresAt) <= now()) return Response.json({ result: "OK" });
    values.set(key, { value, expiresAt: Number(expiresAt) });
    return Response.json({ result: "OK" });
  });
  return { fetcher, values, sweep };
}

describe("provider diagnostic allowlist", () => {
  it("keeps OpenAI text/tool semantics and drops provider metadata", () => {
    expect(extractProviderDiagnosticContent(openAiResponse)).toEqual(openAiDiagnostic);
  });

  it("keeps only Anthropic text/tool-use semantics", () => {
    expect(extractProviderDiagnosticContent({
      id: "msg-secret-id",
      model: "claude-secret",
      role: "assistant",
      stop_reason: "tool_use",
      usage: { input_tokens: 123 },
      content: [
        { type: "thinking", thinking: "private chain", signature: "secret" },
        { type: "text", text: "保留诊断文本", citations: [{ secret: true }] },
        {
          type: "tool_use",
          id: "tool-secret-id",
          name: "refined_prompt",
          input: { zh: "原样对象", nested: [true, null, 2] },
        },
      ],
    })).toEqual({
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "保留诊断文本" },
        {
          type: "tool_use",
          name: "refined_prompt",
          input: { zh: "原样对象", nested: [true, null, 2] },
        },
      ],
    });
  });

  it("parses the current base64 wrapper but rejects unparseable bytes", () => {
    expect(extractProviderDiagnosticContent({
      encoding: "base64",
      data: Buffer.from(JSON.stringify(openAiResponse)).toString("base64"),
    })).toEqual(openAiDiagnostic);
    expect(extractProviderDiagnosticContent({
      encoding: "base64",
      data: Buffer.from("not-json").toString("base64"),
    })).toBeUndefined();
    expect(extractProviderDiagnosticContent({ encoding: "base64", data: "%%%" }))
      .toBeUndefined();
  });
});

describe("raw content Upstash store", () => {
  it("stores exactly the approved fields with a deterministic SHA-256 identity", async () => {
    const now = vi.fn(() => NOW);
    const redis = fakeRedis(now);
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io/",
      token: "raw-secret",
      fetcher: redis.fetcher as typeof fetch,
    });

    await expect(store.write({
      ...providerRecord,
      ignored: "must not persist",
      providerContent: openAiResponse as unknown as ProviderDiagnosticContent,
    } as RawContentRecord & { ignored: string })).resolves.toBe("stored");
    expect(redis.fetcher).toHaveBeenCalledTimes(1);
    const command = JSON.parse(String(redis.fetcher.mock.calls[0]?.[1]?.body)) as string[];
    const [verb, key, value, nx, pxat, expiry] = command;
    expect(verb).toBe("SET");
    expect(nx).toBe("NX");
    expect(pxat).toBe("PXAT");
    expect(expiry).toBe(String(providerRecord.expiresAt));
    expect(key).toMatch(/^thoth:raw-content:v1:[a-f0-9]{64}$/);
    const stored = JSON.parse(value) as Record<string, unknown>;
    expect(stored).toEqual(providerRecord);
    expect(stored).not.toHaveProperty("ignored");
    expect(value).not.toMatch(/chatcmpl-secret-id|deepseek-chat|prompt_tokens|fp-secret|call-secret-id|authorization/);
    expect(value).not.toContain("raw-secret");
    expect(key).toBe(`thoth:raw-content:v1:${createHash("sha256").update(value, "utf8").digest("hex")}`);
  });

  it("uses an absolute 14-day PXAT and deduplicates identical provider delivery", async () => {
    const now = vi.fn(() => NOW);
    const redis = fakeRedis(now);
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: redis.fetcher as typeof fetch,
    });

    await expect(store.write(providerRecord)).resolves.toBe("stored");
    await expect(store.write(providerRecord)).resolves.toBe("duplicate");
    expect(redis.fetcher).toHaveBeenCalledTimes(2);
    const command = JSON.parse(String(redis.fetcher.mock.calls[0]?.[1]?.body)) as string[];
    expect(command).toEqual([
      "SET",
      expect.stringMatching(/^thoth:raw-content:v1:[a-f0-9]{64}$/),
      expect.any(String),
      "NX",
      "PXAT",
      String(NOW + 14 * 24 * 60 * 60 * 1000),
    ]);
    expect(command[5]).toBe(String(NOW + RAW_CONTENT_RETENTION_MS));
  });

  it("keeps independent provider deliveries as separate records", async () => {
    const redis = fakeRedis(() => NOW);
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: redis.fetcher as typeof fetch,
    });

    await expect(store.write(providerRecord)).resolves.toBe("stored");
    await expect(store.write({
      ...providerRecord,
      delivery: 1,
    })).resolves.toBe("stored");
    expect(redis.values.size).toBe(2);
  });

  it("uses logical completion identity without extending the first TTL on replay", async () => {
    const redis = fakeRedis(() => NOW);
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: redis.fetcher as typeof fetch,
    });
    const replay = {
      ...completionRecord,
      recordedAt: NOW + 60_000,
      expiresAt: NOW + RAW_CONTENT_RETENTION_MS + 60_000,
    };

    await expect(store.write(completionRecord)).resolves.toBe("stored");
    await expect(store.write(replay)).resolves.toBe("duplicate");
    const first = JSON.parse(String(redis.fetcher.mock.calls[0]?.[1]?.body)) as string[];
    const second = JSON.parse(String(redis.fetcher.mock.calls[1]?.[1]?.body)) as string[];
    expect(second[1]).toBe(first[1]);
    expect(second[5]).not.toBe(first[5]);
    expect(redis.values.get(first[1]!)?.expiresAt).toBe(completionRecord.expiresAt);
    expect(JSON.parse(redis.values.get(first[1]!)!.value)).toEqual(completionRecord);
  });

  it("preserves an intentionally empty subject brief", async () => {
    const redis = fakeRedis(() => NOW);
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: redis.fetcher as typeof fetch,
    });

    await expect(store.write({ ...providerRecord, subjectBrief: "" })).resolves.toBe("stored");
    expect(JSON.parse([...redis.values.values()][0]!.value)).toEqual({
      ...providerRecord,
      subjectBrief: "",
    });
  });

  it("rejects invalid delivery metadata or unparseable provider bytes without writing", async () => {
    const fetcher = vi.fn(async () => Response.json({ result: "OK" }));
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: fetcher as typeof fetch,
    });

    await expect(store.write({ ...providerRecord, delivery: -1 })).rejects
      .toThrow("raw_content_record_invalid");
    await expect(store.write({
      ...providerRecord,
      providerContent: {
        encoding: "base64",
        data: Buffer.from("not-json").toString("base64"),
      } as unknown as ProviderDiagnosticContent,
    })).rejects.toThrow("raw_content_record_invalid");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes a bounded abort signal and folds fetch errors closed", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    let signal: AbortSignal | null | undefined;
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      signal = init?.signal;
      throw new DOMException("timed out", "TimeoutError");
    });
    const store = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: fetcher as typeof fetch,
    });

    await expect(store.write(providerRecord)).rejects.toThrow("raw_content_store_unavailable");
    expect(timeout).toHaveBeenCalledWith(2_000);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(fetcher).toHaveBeenCalledTimes(1);
    timeout.mockRestore();
  });

  it("fails closed for missing credentials, malformed responses, and oversized values", async () => {
    const fetcher = vi.fn(async () => Response.json({ result: "unexpected" }));
    const store = createRawContentStore({ url: "", token: "", fetcher: fetcher as typeof fetch });
    await expect(store.write(providerRecord)).rejects.toThrow("raw_content_store_unavailable");
    expect(fetcher).not.toHaveBeenCalled();

    const malformed = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher,
    });
    await expect(malformed.write(providerRecord)).rejects.toThrow("raw_content_store_invalid_response");

    const oversized = createRawContentStore({
      url: "https://raw.example.upstash.io",
      token: "raw-secret",
      fetcher: vi.fn(async () => Response.json({ result: "OK" })) as typeof fetch,
    });
    await expect(oversized.write({
      ...providerRecord,
      providerContent: {
        choices: [{ message: { content: "x".repeat(RAW_CONTENT_MAX_BYTES) } }],
      },
    })).rejects.toThrow("raw_content_too_large");
  });
});
