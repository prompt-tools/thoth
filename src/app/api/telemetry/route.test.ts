import { afterEach, describe, expect, it, vi } from "vitest";
import { ATTEMPT_RETENTION_MS } from "@/lib/prompt/agent/attempt-lifecycle";
import { issueJourneyToken } from "@/lib/prompt/agent/journey-state";
import { POST } from "./route";

const NOW = 1_700_000_000_000;
const SECRET = "a-strong-test-secret-with-at-least-32-bytes";

function journeyToken(state: { kind: "done" } | {
  kind: "ask";
  questionId: string;
  optionIds: string[];
  mode: "single" | "multi" | "free_text";
} = {
  kind: "ask",
  questionId: "framing",
  optionIds: ["image_framing:close_up"],
  mode: "single",
}, now = NOW): string {
  return issueJourneyToken({
    secret: SECRET,
    journeyId: "journey-1",
    release: "release-a",
    route: "adaptive",
    subjectBrief: "不会进入遥测",
    history: [],
    precision: "simple",
    state,
    now,
  });
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function configureStore(results: Array<"created" | "exists"> = ["created"]) {
  vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
  let call = 0;
  const fetchSpy = vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    return Response.json({ result: results[call++] ?? "created" });
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/telemetry", () => {
  it("persists only signed server-derived content-free fields", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configureStore();

    const response = await POST(request({
      journeyId: "journey-1",
      journeyToken: journeyToken(),
      eventType: "answer_submitted",
      subjectBrief: "private subject",
      freeText: "private free text",
      history: [{ selectedOptionIds: ["private"] }],
      finalPrompt: "private prompt",
      providerStatus: 200,
      model: "forged-model",
      completion: true,
      retry: true,
      abandonment: true,
      release: "forged-release",
      route: "fixed",
      usage: { completionTokens: 999 },
      cost: 999,
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, duplicate: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const command = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)) as string[];
    expect(command.slice(0, 3)).toEqual(["EVAL", expect.stringContaining("PEXPIREAT"), "1"]);
    expect(command[3]).toMatch(/^thoth:journey-outcome:v1:[A-Za-z0-9_-]{43}$/);
    expect(JSON.parse(command[4])).toEqual({
      version: 1,
      eventType: "answer_submitted",
      journeyId: "journey-1",
      release: "release-a",
      route: "adaptive",
      turn: 0,
      stateKind: "ask",
      questionId: "framing",
      recordedAt: NOW,
      expiresAt: NOW + ATTEMPT_RETENTION_MS,
    });
    expect(command[5]).toBe(String(NOW + ATTEMPT_RETENTION_MS));
    expect(command.join(" ")).not.toMatch(/private|forged|completionTokens|cost/);
  });

  it("deduplicates the same event identity while keeping distinct events observable", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configureStore(["created", "exists", "created"]);
    const base = { journeyId: "journey-1", journeyToken: journeyToken() };

    const first = await POST(request({ ...base, eventType: "answer_submitted" }));
    const duplicate = await POST(request({ ...base, eventType: "answer_submitted" }));
    const distinct = await POST(request({ ...base, eventType: "turn_skipped" }));

    expect([first.status, duplicate.status, distinct.status]).toEqual([202, 200, 202]);
    expect(await duplicate.json()).toEqual({ ok: true, duplicate: true });
    const keys = fetchSpy.mock.calls.map((call) => (JSON.parse(String(call[1]?.body)) as string[])[3]);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it.each(["unsigned", "tampered", "expired"])("rejects %s Journey proof before persistence", async (kind) => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configureStore();
    let token = kind === "unsigned" ? "" : journeyToken(undefined, kind === "expired" ? NOW - 31 * 60 * 1000 : NOW);
    if (kind === "tampered") token = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    const response = await POST(request({
      journeyId: "journey-1",
      journeyToken: token,
      eventType: "answer_submitted",
    }));

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects unknown events and events that do not match the signed state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configureStore();
    const ask = journeyToken();
    const done = journeyToken({ kind: "done" });

    const unknown = await POST(request({
      journeyId: "journey-1",
      journeyToken: ask,
      eventType: "provider_succeeded",
    }));
    const falseCompletion = await POST(request({
      journeyId: "journey-1",
      journeyToken: ask,
      eventType: "prompt_rendered",
    }));
    const answerAgainstDone = await POST(request({
      journeyId: "journey-1",
      journeyToken: done,
      eventType: "answer_submitted",
    }));

    expect(unknown.status).toBe(400);
    expect(falseCompletion.status).toBe(409);
    expect(answerAgainstDone.status).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a Journey id that does not match the signed state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configureStore();

    const response = await POST(request({
      journeyId: "journey-2",
      journeyToken: journeyToken(),
      eventType: "answer_submitted",
    }));

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
