import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPrompt } from "@/lib/prompt/adapters";
import { buildCatalogManifest } from "@/lib/prompt/agent/catalog-manifest";
import { buildRenderInputs, withInferredSubject } from "@/lib/prompt/agent/history";
import { issueJourneyToken } from "@/lib/prompt/agent/journey-state";
import { RAW_CONTENT_MAX_BYTES, RAW_CONTENT_RETENTION_MS } from "@/lib/prompt/agent/raw-content-store";
import { routePrimaryType } from "@/lib/prompt/agent/routing";
import { imagePromptAgentWorkType } from "@/lib/prompt/work-types/image-prompt-agent.worktype";
import { POST, dynamic, runtime } from "./route";

const NOW = 1_700_000_000_000;
const SECRET = "a-strong-test-secret-with-at-least-32-bytes";
const subjectBrief = "雨夜女侦探";
const history = [{
  questionId: "image-pose",
  selectedOptionIds: ["standing"],
  freeText: "自然站姿",
}];
const precision = "standard" as const;

function finalPromptFor(
  brief: string,
  signedHistory: typeof history,
): { zh: string; en: string } {
  const manifest = buildCatalogManifest();
  const { selections, freeTexts } = buildRenderInputs(
    withInferredSubject(signedHistory, brief, routePrimaryType(brief)),
    manifest,
  );
  const rendered = renderPrompt({
    workType: imagePromptAgentWorkType,
    rawIntent: brief,
    selections,
    freeTexts,
  });
  return { zh: rendered.zhPrompt, en: rendered.enPrompt };
}

function journeyToken(args: {
  subjectBrief?: string;
  history?: typeof history;
  precision?: typeof precision;
  consent?: { version: 1; acceptedAt: number } | null;
  sampled?: boolean;
  now?: number;
  state?: { kind: "done" } | {
    kind: "ask";
    questionId: string;
    optionIds: string[];
    mode: "single" | "multi" | "free_text";
  };
} = {}): string {
  const issuedAt = args.now ?? NOW;
  return issueJourneyToken({
    secret: SECRET,
    journeyId: "journey-1",
    release: "release-a",
    route: "adaptive",
    subjectBrief: args.subjectBrief ?? subjectBrief,
    history: args.history ?? history,
    precision: args.precision ?? precision,
    state: args.state ?? { kind: "done" },
    consent: args.consent === undefined
      ? { version: 1, acceptedAt: issuedAt }
      : args.consent,
    rawContentSampled: args.sampled ?? true,
    now: issuedAt,
  });
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/raw-content", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    journeyId: "journey-1",
    journeyToken: journeyToken(),
    subjectBrief,
    history,
    precision,
    ...overrides,
  };
}

function configure({ enabled = true, credentials = true, retentionVerified = true } = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("ADAPTIVE_TURN_SECRET", SECRET);
  vi.stubEnv("RAW_CONTENT_SAMPLING_ENABLED", enabled ? "1" : "0");
  vi.stubEnv("RAW_CONTENT_RETENTION_VERIFIED", retentionVerified ? "1" : "0");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://attempts.example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "attempt-token");
  if (credentials) {
    vi.stubEnv("RAW_CONTENT_REDIS_REST_URL", "https://raw.example.upstash.io");
    vi.stubEnv("RAW_CONTENT_REDIS_REST_TOKEN", "raw-token");
  }
  const fetchSpy = vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    return Response.json({ result: "OK" });
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/raw-content", () => {
  it("is a dynamic Node route", () => {
    expect(runtime).toBe("nodejs");
    expect(dynamic).toBe("force-dynamic");
  });

  it("stores an eligible completion with signed metadata and a 14-day expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configure();

    const response = await POST(request({
      ...body(),
      providerContent: "must be discarded",
      release: "forged-release",
      route: "fixed",
      turn: 999,
      consent: null,
      rawContentSampled: false,
      finalPrompt: { zh: "forged-zh", en: "forged-en", ignored: "must be discarded" },
      history: [{ ...history[0], ignored: "must be discarded" }],
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const command = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as string[];
    expect(command[0]).toBe("SET");
    expect(command[1]).toMatch(/^thoth:raw-content:v1:[a-f0-9]{64}$/);
    expect(command.slice(3)).toEqual([
      "NX",
      "PXAT",
      String(NOW + RAW_CONTENT_RETENTION_MS),
    ]);
    expect(JSON.parse(command[2])).toEqual({
      version: 1,
      kind: "completion",
      journeyId: "journey-1",
      release: "release-a",
      route: "adaptive",
      turn: history.length,
      recordedAt: NOW,
      expiresAt: NOW + RAW_CONTENT_RETENTION_MS,
      subjectBrief,
      history,
      finalPrompt: finalPromptFor(subjectBrief, history),
    });
    expect(command[2]).not.toMatch(/forged|providerContent|ignored|rawContentSampled/);
  });

  it.each([
    ["deployment-disabled", { enabled: false }],
    ["unconsented", { token: journeyToken({ consent: null, sampled: false }) }],
    ["unsampled", { token: journeyToken({ sampled: false }) }],
  ])("returns generic acceptance without writing for %s", async (_kind, options) => {
    const token = "token" in options ? options.token : undefined;
    const enabled = "enabled" in options ? options.enabled : true;
    const fetchSpy = configure({ enabled });
    const response = await POST(request(body(token ? { journeyToken: token } : {})));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps sampling disabled until retention verification is enabled", async () => {
    const fetchSpy = configure({ retentionVerified: false });
    const response = await POST(request(body()));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["tampered", () => {
      const token = journeyToken();
      return `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    }],
    ["expired", () => journeyToken({ now: NOW - 31 * 60 * 1000 })],
  ])("rejects %s proof before raw persistence", async (_kind, makeToken) => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const fetchSpy = configure();

    const response = await POST(request(body({ journeyToken: makeToken() })));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_journey_state" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["subject", { subjectBrief: "被篡改的主体" }],
    ["history", { history: [{ questionId: "other", selectedOptionIds: [] }] }],
    ["precision", { precision: "detailed" }],
    ["state", { journeyToken: journeyToken({ state: {
      kind: "ask",
      questionId: "framing",
      optionIds: ["close"],
      mode: "single",
    } }) }],
  ])("rejects a %s snapshot mismatch before raw persistence", async (_kind, override) => {
    const fetchSpy = configure();
    const response = await POST(request(body(override)));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "journey_state_mismatch" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed for missing raw credentials only after eligible capture", async () => {
    const fetchSpy = configure({ credentials: false });

    const eligible = await POST(request(body()));
    const ineligible = await POST(request(body({
      journeyToken: journeyToken({ sampled: false }),
    })));

    expect(eligible.status).toBe(503);
    expect(await eligible.json()).toEqual({ ok: false, error: "raw_content_unavailable" });
    expect(ineligible.status).toBe(202);
    expect(await ineligible.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["url", "token"] as const)("fails closed when raw and content-free Redis reuse the same %s", async (field) => {
    const fetchSpy = configure();
    if (field === "url") {
      vi.stubEnv("RAW_CONTENT_REDIS_REST_URL", "https://attempts.example.upstash.io/");
    } else {
      vi.stubEnv("RAW_CONTENT_REDIS_REST_TOKEN", "attempt-token");
    }

    const response = await POST(request(body()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "raw_content_unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed when content-free Redis credentials are incomplete", async () => {
    const fetchSpy = configure();
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const response = await POST(request(body()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "raw_content_unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not expose an eligible raw-store failure", async () => {
    const fetchSpy = configure();
    fetchSpy.mockResolvedValue(new Response("offline", { status: 503 }));

    const response = await POST(request(body()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "raw_content_unavailable" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("accepts an empty subject brief when it matches the signed snapshot", async () => {
    const fetchSpy = configure();
    const token = journeyToken({ subjectBrief: "" });
    const response = await POST(request(body({ journeyToken: token, subjectBrief: "" })));

    expect(response.status).toBe(202);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const command = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as string[];
    expect(JSON.parse(command[2])).toMatchObject({ subjectBrief: "" });
  });

  it("rejects leading or trailing Subject whitespace that is absent from the signed snapshot", async () => {
    const fetchSpy = configure();
    const response = await POST(request(body({ subjectBrief: ` ${subjectBrief} ` })));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "journey_state_mismatch" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a request larger than the raw-store limit before parsing or writing", async () => {
    const fetchSpy = configure();
    const response = await POST(request({
      ...body(),
      subjectBrief: "x".repeat(RAW_CONTENT_MAX_BYTES),
    }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false, error: "payload_too_large" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
