import "@/lib/prompt/init";
import { describe, expect, it, vi } from "vitest";
import {
  handleJourneyTurnRequest,
  type JourneyTurnRuntimeDeps,
} from "./journey-turn-runtime";
import { buildTurnRequest, ProviderTransportError } from "./client";
import { buildAdaptiveTurnSnapshot } from "./adaptive-turn";
import { buildCatalogManifest } from "./catalog-manifest";
import {
  assignRawContentSample,
  issueJourneyToken,
  matchesJourneySnapshot,
  readJourneyToken,
} from "./journey-state";
import { getProvider } from "./providers";
import {
  RAW_CONTENT_RETENTION_MS,
  type RawContentStore,
} from "./raw-content-store";

const SECRET = "a-strong-test-secret-with-at-least-32-bytes";

function request(body: unknown): Request {
  return new Request("http://localhost/api/journey-turn", {
    method: "POST",
    headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function attemptDeps(): Pick<JourneyTurnRuntimeDeps, "newAttemptId" | "attemptStore"> {
  let sequence = 0;
  return {
    newAttemptId: () => `attempt-${++sequence}`,
    attemptStore: {
      start: async () => "created",
      finish: async () => "written",
    },
  };
}

function afterResponseQueue() {
  const tasks: Array<() => Promise<void>> = [];
  return {
    scheduleAfterResponse: (task: () => Promise<void>) => { tasks.push(task); },
    tasks,
    flush: async () => {
      await Promise.all(tasks.splice(0).map((task) => task()));
    },
  };
}

function fixedModelResponse(subjectBrief = "原创游侠角色") {
  const { ctx } = buildTurnRequest(getProvider("deepseek"), "server-key", {
    manifest: buildCatalogManifest(),
    history: [],
    userDescription: subjectBrief,
    precision: "simple",
  });
  return {
    choices: [{
      message: { tool_calls: [{ function: { arguments: JSON.stringify({
        visibleOptionIds: ctx.filteredCurrentOptionIds.slice(0, 3),
        helperText: "选择角色的核心气质。",
      }) } }] },
    }],
  };
}

describe("Built-in Journey HTTP boundary", () => {
  it("persists a content-free fixed attempt before the provider and finalizes the validated Ask", async () => {
    const events: string[] = [];
    const started: unknown[] = [];
    const terminal: unknown[] = [];
    const attemptStore = {
      start: vi.fn(async (record: unknown) => {
        events.push("started");
        started.push(record);
        return "created" as const;
      }),
      finish: vi.fn(async (_attemptId: string, record: unknown) => {
        events.push("terminal");
        terminal.push(record);
        return "written" as const;
      }),
    };
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => {
      events.push("provider");
      return {
        ...fixedModelResponse("不要把这段主体描述写进 attempt"),
        usage: { prompt_tokens: 20, completion_tokens: 8 },
      };
    });

    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "不要把这段主体描述写进 attempt",
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      newAttemptId: () => "attempt-1",
      attemptStore,
      fixedTransport,
      adaptiveExchange: vi.fn(),
    } as JourneyTurnRuntimeDeps);

    expect(response.status).toBe(200);
    expect(events).toEqual(["started", "provider", "terminal"]);
    expect(started).toEqual([expect.objectContaining({
      attemptId: "attempt-1",
      journeyId: "journey-1",
      release: "release-a",
      route: "fixed",
      cohort: "fixed",
      turn: 0,
      expiresAt: 1_702_592_000_000,
    })]);
    expect(terminal).toEqual([expect.objectContaining({
      outcome: "success",
      validation: "ask",
      usage: { promptTokens: 20, completionTokens: 8 },
    })]);
    expect(JSON.stringify({ started, terminal })).not.toContain("不要把这段主体描述写进 attempt");
  });

  it("uses a distinct attempt for every fixed provider retry", async () => {
    const started: Array<{ attemptId: string }> = [];
    const terminal: Array<{ attemptId: string; record: Record<string, unknown> }> = [];
    let sequence = 0;
    let call = 0;
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      newAttemptId: () => `attempt-${++sequence}`,
      attemptStore: {
        start: async (record) => {
          started.push(record);
          return "created";
        },
        finish: async (attemptId, record) => {
          terminal.push({ attemptId, record });
          return "written";
        },
      },
      fixedTransport: async () => {
        call += 1;
        if (call === 1) throw new ProviderTransportError("http_503", 503);
        if (call === 2) throw new ProviderTransportError("network_error");
        return fixedModelResponse();
      },
      adaptiveExchange: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(started.map((record) => record.attemptId)).toEqual([
      "attempt-1", "attempt-2", "attempt-3",
    ]);
    expect(terminal).toEqual([
      { attemptId: "attempt-1", record: expect.objectContaining({ outcome: "failure", failureCode: "http_503", providerStatus: 503 }) },
      { attemptId: "attempt-2", record: expect.objectContaining({ outcome: "failure", failureCode: "network_error" }) },
      { attemptId: "attempt-3", record: expect.objectContaining({ outcome: "success", validation: "ask" }) },
    ]);
  });

  it("fails closed before the provider when Started cannot be persisted", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      newAttemptId: () => "attempt-1",
      attemptStore: {
        start: async () => { throw new Error("redis offline"); },
        finish: async () => "missing",
      },
      fixedTransport,
      adaptiveExchange: vi.fn(),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "attempt_store_unavailable" });
    expect(fixedTransport).not.toHaveBeenCalled();
  });

  it("rejects an observable conflicting terminal instead of replacing it", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => ({}));
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      newAttemptId: () => "attempt-1",
      attemptStore: {
        start: async () => "created",
        finish: async () => "conflict",
      },
      fixedTransport,
      adaptiveExchange: vi.fn(),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "attempt_terminal_conflict" });
    expect(fixedTransport).toHaveBeenCalledTimes(1);
  });

  it("links an Adaptive attempt to the authenticated Journey and validated Ask", async () => {
    const subjectBrief = "原创游侠角色";
    const snapshot = buildAdaptiveTurnSnapshot({ subjectBrief, history: [], precision: "simple" });
    const dimension = snapshot.eligibleDimensions[0];
    const started: unknown[] = [];
    const terminal: unknown[] = [];
    const response = await handleJourneyTurnRequest(request({
      subjectBrief,
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "100",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-adaptive",
      newAttemptId: () => "attempt-adaptive-1",
      attemptStore: {
        start: async (record) => {
          started.push(record);
          return "created";
        },
        finish: async (_attemptId, record) => {
          terminal.push(record);
          return "written";
        },
      },
      fixedTransport: vi.fn(),
      adaptiveExchange: async () => ({
        kind: "http",
        status: 200,
        headers: {},
        body: new TextEncoder().encode(JSON.stringify({
          choices: [{
            finish_reason: "tool_calls",
            message: { tool_calls: [{ function: {
              name: "decide_adaptive_turn",
              arguments: JSON.stringify({
                done: false,
                nextQuestionId: dimension.questionId,
                questionText: dimension.title,
                helperText: dimension.helper,
                optionIds: dimension.candidates.slice(0, 3).map((option) => option.id),
              }),
            } }] },
          }],
          usage: { prompt_tokens: 30, completion_tokens: 12 },
        })),
      }),
    });

    expect(response.status).toBe(200);
    expect(started).toEqual([expect.objectContaining({
      attemptId: "attempt-adaptive-1",
      journeyId: "journey-adaptive",
      release: "release-a",
      route: "adaptive",
      cohort: "adaptive",
      turn: 0,
    })]);
    expect(terminal).toEqual([expect.objectContaining({
      outcome: "success",
      validation: "ask",
      usage: { promptTokens: 30, completionTokens: 12 },
    })]);
  });

  it("assigns a new attempt ID when the same signed turn is manually retried", async () => {
    let sequence = 0;
    const started: Array<{ attemptId: string; journeyId: string; turn: number }> = [];
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      newAttemptId: () => `attempt-${++sequence}`,
      attemptStore: {
        start: async (record) => {
          started.push(record);
          return "created";
        },
        finish: async () => "written",
      },
      fixedTransport: async () => ({}),
      adaptiveExchange: vi.fn(),
    };
    const first = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), deps)).json();
    const retryBody = {
      subjectBrief: "原创游侠角色",
      history: [{
        questionId: first.decision.nextQuestionId,
        selectedOptionIds: [first.decision.visibleOptionIds[0]],
      }],
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
    };

    const firstTry = await handleJourneyTurnRequest(request(retryBody), deps);
    const manualRetry = await handleJourneyTurnRequest(request(retryBody), deps);

    expect(firstTry.status).toBe(200);
    expect(manualRetry.status).toBe(200);
    expect(started).toEqual([
      expect.objectContaining({ attemptId: "attempt-1", journeyId: "journey-1", turn: 0 }),
      expect.objectContaining({ attemptId: "attempt-2", journeyId: "journey-1", turn: 1 }),
      expect.objectContaining({ attemptId: "attempt-3", journeyId: "journey-1", turn: 1 }),
    ]);
  });

  it.each([
    ["omitted", {}],
    ["declined", { rawContentConsent: false }],
  ])("keeps raw-content consent off when it is %s", async (_kind, consentInput) => {
    const now = 1_700_000_000_000;
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      ...consentInput,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "journey-default-off",
      ...attemptDeps(),
      fixedTransport: async () => ({}),
      adaptiveExchange: vi.fn(),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(readJourneyToken(SECRET, result.journey.token, now)).toMatchObject({
      issuedAt: now,
      consent: null,
      rawContentSampled: false,
    });
  });

  it.each([null, "true", 1, {}, []])("rejects malformed raw-content consent %#", async (rawContentConsent) => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-invalid-consent",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_journey_state" });
    expect(fixedTransport).not.toHaveBeenCalled();
  });

  it("sets consent version and acceptance time on the server and ignores forged initial claims", async () => {
    const now = 1_700_000_000_000;
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent: true,
      consent: { version: 999, acceptedAt: 1 },
      consentVersion: 999,
      acceptedAt: 1,
      issuedAt: 1,
      rawContentSampled: true,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "consent-6",
      ...attemptDeps(),
      fixedTransport: async () => ({}),
      adaptiveExchange: vi.fn(),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(readJourneyToken(SECRET, result.journey.token, now)).toMatchObject({
      journeyId: "consent-6",
      issuedAt: now,
      consent: { version: 1, acceptedAt: now },
      rawContentSampled: false,
    });
  });

  it("adopts a validated client Journey ID and keeps first-response retries on a secret sample", async () => {
    const clientJourneyId = "00000000-0000-4000-8000-00000000000d";
    const newJourneyId = vi.fn(() => "server-generated");
    const body = {
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      journeyId: clientJourneyId,
      rawContentConsent: true,
      rawContentSampled: false,
      rawContentEligible: false,
    };
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId,
      ...attemptDeps(),
      fixedTransport: async () => fixedModelResponse(),
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled: true,
    };

    const first = await (await handleJourneyTurnRequest(request(body), deps)).json();
    const retry = await (await handleJourneyTurnRequest(request(body), deps)).json();
    const otherSecret = await (await handleJourneyTurnRequest(request({
      ...body,
      rawContentSampled: true,
      rawContentEligible: true,
    }), {
      ...deps,
      secret: "another-strong-test-secret-over-32-bytes",
    })).json();
    const unsampledJourneyId = "00000000-0000-4000-8000-000000000002";
    const unsampled = await (await handleJourneyTurnRequest(request({
      ...body,
      journeyId: unsampledJourneyId,
    }), deps)).json();

    expect(newJourneyId).not.toHaveBeenCalled();
    expect(first.journey.id).toBe(clientJourneyId);
    expect(retry.journey.id).toBe(clientJourneyId);
    expect(readJourneyToken(SECRET, first.journey.token, 1_700_000_000_000).rawContentSampled).toBe(true);
    expect(readJourneyToken(SECRET, retry.journey.token, 1_700_000_000_000).rawContentSampled).toBe(true);
    expect(first.rawContentEligible).toBe(true);
    expect(retry.rawContentEligible).toBe(true);
    expect(assignRawContentSample(SECRET, "release-a", clientJourneyId)).toBe(true);
    expect(assignRawContentSample(
      "another-strong-test-secret-over-32-bytes",
      "release-a",
      clientJourneyId,
    )).toBe(false);
    expect(readJourneyToken(
      "another-strong-test-secret-over-32-bytes",
      otherSecret.journey.token,
      1_700_000_000_000,
    ).rawContentSampled).toBe(false);
    expect(otherSecret.rawContentEligible).toBe(false);
    expect(assignRawContentSample(SECRET, "release-a", unsampledJourneyId)).toBe(false);
    expect(readJourneyToken(
      SECRET,
      unsampled.journey.token,
      1_700_000_000_000,
    ).rawContentSampled).toBe(false);
    expect(unsampled.rawContentEligible).toBe(false);
  });

  it("rejects an invalid client Journey ID before provider execution", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      journeyId: "browser-chosen-sample",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: vi.fn(() => "server-generated"),
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_journey_state" });
    expect(fixedTransport).not.toHaveBeenCalled();
  });

  it.each([
    ["consent-0", true],
    ["consent-6", false],
  ])("keeps the server sample for %s stable across a turn and manual retry", async (journeyId, sampled) => {
    let now = 1_700_000_000_000;
    const rawWrite = vi.fn<RawContentStore["write"]>(async () => "stored");
    const background = afterResponseQueue();
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => journeyId,
      ...attemptDeps(),
      fixedTransport: async () => fixedModelResponse(),
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled: true,
      rawContentStore: { write: rawWrite },
      scheduleAfterResponse: background.scheduleAfterResponse,
    };
    const first = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent: true,
    }), deps)).json();
    const firstClaims = readJourneyToken(SECRET, first.journey.token, now);
    const retryBody = {
      subjectBrief: "原创游侠角色",
      history: [{
        questionId: first.decision.nextQuestionId,
        selectedOptionIds: [first.decision.visibleOptionIds[0]],
      }],
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
      consent: { version: 999, acceptedAt: 1 },
      rawContentSampled: !sampled,
    };

    now += 1_000;
    const second = await (await handleJourneyTurnRequest(request(retryBody), deps)).json();
    const secondClaims = readJourneyToken(SECRET, second.journey.token, now);
    now += 1_000;
    const manualRetry = await (await handleJourneyTurnRequest(request(retryBody), deps)).json();
    const retryClaims = readJourneyToken(SECRET, manualRetry.journey.token, now);
    await background.flush();

    expect(firstClaims).toMatchObject({
      issuedAt: 1_700_000_000_000,
      consent: { version: 1, acceptedAt: 1_700_000_000_000 },
      rawContentSampled: sampled,
    });
    expect(secondClaims).toMatchObject({
      issuedAt: 1_700_000_001_000,
      consent: firstClaims.consent,
      rawContentSampled: sampled,
    });
    expect(retryClaims).toMatchObject({
      issuedAt: 1_700_000_002_000,
      consent: firstClaims.consent,
      rawContentSampled: sampled,
    });
    expect(rawWrite).toHaveBeenCalledTimes(sampled ? 3 : 0);
    expect(rawWrite.mock.calls.map(([record]) => ({
      turn: record.turn,
      delivery: record.kind === "provider" ? record.delivery : undefined,
    }))).toEqual(sampled ? [
      { turn: 0, delivery: 0 },
      { turn: 1, delivery: 0 },
      { turn: 1, delivery: 0 },
    ] : []);
  });

  it("does not let continuation fields elevate an unconsented Journey", async () => {
    let now = 1_700_000_000_000;
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "consent-6",
      ...attemptDeps(),
      fixedTransport: async () => ({}),
      adaptiveExchange: vi.fn(),
    };
    const first = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), deps)).json();
    now += 1_000;
    const second = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [{
        questionId: first.decision.nextQuestionId,
        selectedOptionIds: [first.decision.visibleOptionIds[0]],
      }],
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
      rawContentConsent: true,
      consent: { version: 1, acceptedAt: now },
      consentVersion: 1,
      acceptedAt: now,
      issuedAt: now,
      rawContentSampled: true,
    }), deps)).json();

    expect(readJourneyToken(SECRET, second.journey.token, now)).toMatchObject({
      consent: null,
      rawContentSampled: false,
    });
  });

  it.each([
    ["unconsented", "consent-6", undefined, true, 0],
    ["unsampled", "consent-6", true, true, 0],
    ["deployment-disabled", "consent-0", true, false, 0],
    ["authorized", "consent-0", true, true, 1],
  ])("gates fixed raw provider capture when %s", async (
    _kind,
    journeyId,
    rawContentConsent,
    rawContentSamplingEnabled,
    expectedWrites,
  ) => {
    const now = 1_700_000_000_000;
    const providerContent = {
      id: "drop-provider-id",
      model: "drop-provider-model",
      usage: { prompt_tokens: 20, completion_tokens: 8 },
      ...fixedModelResponse(),
    };
    const write = vi.fn(async () => "stored" as const);
    const background = afterResponseQueue();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => journeyId,
      ...attemptDeps(),
      fixedTransport: async () => providerContent,
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled,
      rawContentStore: { write },
      scheduleAfterResponse: background.scheduleAfterResponse,
    });
    await background.flush();

    expect(response.status).toBe(200);
    expect(write).toHaveBeenCalledTimes(expectedWrites);
    if (expectedWrites === 1) {
      expect(write).toHaveBeenCalledWith({
        version: 1,
        kind: "provider",
        journeyId,
        release: "release-a",
        route: "fixed",
        turn: 0,
        recordedAt: now,
        expiresAt: now + RAW_CONTENT_RETENTION_MS,
        subjectBrief: "原创游侠角色",
        history: [],
        delivery: 0,
        providerContent: fixedModelResponse(),
      });
    }
  });

  it("captures only semantic Adaptive provider content", async () => {
    const now = 1_700_000_000_000;
    const subjectBrief = "原创游侠角色";
    const snapshot = buildAdaptiveTurnSnapshot({ subjectBrief, history: [], precision: "simple" });
    const dimension = snapshot.eligibleDimensions[0];
    const providerResponse = {
      id: "drop-provider-id",
      model: "drop-provider-model",
      usage: { prompt_tokens: 30, completion_tokens: 12 },
      choices: [{
        finish_reason: "tool_calls",
        message: { tool_calls: [{ function: {
          name: "decide_adaptive_turn",
          arguments: JSON.stringify({
            done: false,
            nextQuestionId: dimension.questionId,
            questionText: dimension.title,
            helperText: dimension.helper,
            optionIds: dimension.candidates.slice(0, 3).map((option) => option.id),
          }),
        } }] },
      }],
    };
    const rawBody = new TextEncoder().encode(` ${JSON.stringify(providerResponse)} `);
    const write = vi.fn(async () => "stored" as const);
    const background = afterResponseQueue();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief,
      history: [],
      precision: "simple",
      rawContentConsent: true,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "100",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "consent-0",
      ...attemptDeps(),
      fixedTransport: vi.fn(),
      adaptiveExchange: async () => ({ kind: "http", status: 200, headers: {}, body: rawBody }),
      rawContentSamplingEnabled: true,
      rawContentStore: { write },
      scheduleAfterResponse: background.scheduleAfterResponse,
    });
    await background.flush();

    expect(response.status).toBe(200);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({
      journeyId: "consent-0",
      route: "adaptive",
      delivery: 0,
      providerContent: { choices: providerResponse.choices },
    }));
  });

  it("runs raw storage after the Journey response and swallows background failures", async () => {
    const write = vi.fn(async () => { throw new Error("raw store offline"); });
    const background = afterResponseQueue();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent: true,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "consent-0",
      ...attemptDeps(),
      fixedTransport: async () => fixedModelResponse(),
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled: true,
      rawContentStore: { write },
      scheduleAfterResponse: background.scheduleAfterResponse,
    });

    expect(response.status).toBe(200);
    expect(write).not.toHaveBeenCalled();
    await expect(background.flush()).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("returns the Journey before a permanently pending raw write settles", async () => {
    const write = vi.fn<RawContentStore["write"]>(() => new Promise(() => {}));
    const background = afterResponseQueue();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent: true,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "consent-0",
      ...attemptDeps(),
      fixedTransport: async () => fixedModelResponse(),
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled: true,
      rawContentStore: { write },
      scheduleAfterResponse: background.scheduleAfterResponse,
    });

    expect(response.status).toBe(200);
    expect(background.tasks).toHaveLength(1);
    expect(write).not.toHaveBeenCalled();
    void background.tasks[0]();
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  });

  it("keeps the Journey response when the platform scheduler throws", async () => {
    const write = vi.fn<RawContentStore["write"]>(async () => "stored");
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      rawContentConsent: true,
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "consent-0",
      ...attemptDeps(),
      fixedTransport: async () => fixedModelResponse(),
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled: true,
      rawContentStore: { write },
      scheduleAfterResponse: () => { throw new Error("after timeout"); },
    });

    expect(response.status).toBe(200);
    expect(write).not.toHaveBeenCalled();
  });

  it("issues a signed fixed-cohort Journey at zero exposure", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => ({
      choices: [{
        message: {
          tool_calls: [{ function: { arguments: JSON.stringify({
            visibleOptionIds: [
              "image_character_archetype:hero",
              "image_character_archetype:rebel",
              "image_character_archetype:explorer",
            ],
            helperText: "选择角色的核心气质。",
          }) } }],
        },
      }],
    }));

    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      journey: { id: "journey-1", route: "fixed", token: expect.any(String) },
      decision: { done: false },
    });
    expect(fixedTransport).toHaveBeenCalledTimes(1);
  });

  it("signs the exact fixed completion snapshot without another routing call", async () => {
    let now = 1_700_000_000_000;
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => ({}));
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "journey-1",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
      rawContentSamplingEnabled: true,
    };
    const first = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), deps)).json();
    const acceptedHistory = [{
      questionId: first.decision.nextQuestionId,
      selectedOptionIds: [first.decision.visibleOptionIds[0]],
    }];
    now += 1_000;
    const second = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: acceptedHistory,
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
    }), deps)).json();
    const secondClaims = readJourneyToken(SECRET, second.journey.token, now);
    const fillDimension = buildCatalogManifest().find((dimension) => (
      dimension.questionId !== acceptedHistory[0].questionId && dimension.options.length > 0
    ))!;
    const completedHistory = [...acceptedHistory, {
      questionId: fillDimension.questionId,
      selectedOptionIds: [fillDimension.options[0].id],
    }];

    now += 1_000;
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: completedHistory,
      precision: "simple",
      journeyId: second.journey.id,
      journeyToken: second.journey.token,
      complete: true,
    }), deps);
    const result = await response.json();
    const claims = readJourneyToken(SECRET, result.journey.token, now);

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      journey: { id: "journey-1", route: "fixed" },
      decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
      rawContentEligible: false,
    });
    expect(claims.state).toEqual({ kind: "done" });
    expect(claims.issuedAt).toBe(secondClaims.issuedAt);
    expect(claims.expiresAt).toBe(secondClaims.expiresAt);
    expect(matchesJourneySnapshot(claims, "原创游侠角色", completedHistory, "simple")).toBe(true);
    expect(fixedTransport).toHaveBeenCalledTimes(2);
  });

  it("rejects zero-answer Ask completion while allowing early completion after one answer", async () => {
    let now = 1_700_000_000_000;
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => fixedModelResponse());
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "journey-1",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
    };
    const first = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), deps)).json();

    const zeroAnswer = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
      complete: true,
    }), deps);

    expect(zeroAnswer.status).toBe(400);
    expect(await zeroAnswer.json()).toEqual({ error: "invalid_journey_state" });

    const acceptedHistory = [{
      questionId: first.decision.nextQuestionId,
      selectedOptionIds: [first.decision.visibleOptionIds[0]],
    }];
    now += 1_000;
    const second = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: acceptedHistory,
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
    }), deps)).json();
    const secondClaims = readJourneyToken(SECRET, second.journey.token, now);
    now += 1_000;
    const earlyCompletion = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: acceptedHistory,
      precision: "simple",
      journeyId: second.journey.id,
      journeyToken: second.journey.token,
      complete: true,
    }), deps);
    const result = await earlyCompletion.json();
    const claims = readJourneyToken(SECRET, result.journey.token, now);

    expect(earlyCompletion.status).toBe(200);
    expect(result.decision).toEqual({ nextQuestionId: null, visibleOptionIds: [], done: true });
    expect(claims).toMatchObject({
      state: { kind: "done" },
      turn: 1,
      issuedAt: secondClaims.issuedAt,
      expiresAt: secondClaims.expiresAt,
    });
    expect(fixedTransport).toHaveBeenCalledTimes(2);
  });

  it("keeps Done completion replays idempotent without renewing the signed lifetime", async () => {
    const issuedAt = 1_700_000_000_000;
    let now = issuedAt + 1_000;
    const manifest = buildCatalogManifest();
    const answered = manifest.find((dimension) => dimension.options.length > 0)!;
    const history = [{
      questionId: answered.questionId,
      selectedOptionIds: [answered.options[0].id],
    }];
    const originalToken = issueJourneyToken({
      secret: SECRET,
      journeyId: "journey-1",
      release: "release-a",
      route: "fixed",
      subjectBrief: "原创游侠角色",
      history,
      precision: "simple",
      state: { kind: "done" },
      now: issuedAt,
    });
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>();
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => now,
      newJourneyId: () => "unused",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
    };
    const baseBody = {
      subjectBrief: "原创游侠角色",
      history,
      precision: "simple",
      journeyId: "journey-1",
      journeyToken: originalToken,
      complete: true,
    };

    const exactReplay = await (await handleJourneyTurnRequest(request(baseBody), deps)).json();

    expect(exactReplay.journey.token).toBe(originalToken);

    const fillDimension = manifest.find((dimension) => (
      dimension.questionId !== answered.questionId && dimension.options.length > 0
    ))!;
    const extendedHistory = [...history, {
      questionId: fillDimension.questionId,
      selectedOptionIds: [fillDimension.options[0].id],
    }];
    const extensionBody = { ...baseBody, history: extendedHistory };
    now += 60_000;
    const firstExtension = await (await handleJourneyTurnRequest(request(extensionBody), deps)).json();
    now += 60_000;
    const replayedExtension = await (await handleJourneyTurnRequest(request(extensionBody), deps)).json();
    const claims = readJourneyToken(SECRET, firstExtension.journey.token, now);

    expect(firstExtension.journey.token).toBe(replayedExtension.journey.token);
    expect(firstExtension.journey.token).not.toBe(originalToken);
    expect(claims).toMatchObject({
      issuedAt,
      expiresAt: issuedAt + 30 * 60 * 1_000,
      state: { kind: "done" },
      turn: extendedHistory.length,
    });
    expect(matchesJourneySnapshot(claims, "原创游侠角色", extendedHistory, "simple")).toBe(true);
    expect(fixedTransport).not.toHaveBeenCalled();
  });

  it("rejects unknown history fields before signing or provider execution", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => fixedModelResponse());
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange: vi.fn(),
    };
    const first = await (await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), deps)).json();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [{
        questionId: first.decision.nextQuestionId,
        selectedOptionIds: [first.decision.visibleOptionIds[0]],
        ignored: "must not enter the signed snapshot",
      }],
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
    }), deps);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_journey_state" });
    expect(fixedTransport).toHaveBeenCalledTimes(1);
  });

  it("accepts one legal answer and advances only with the latest signed token", async () => {
    const deps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "0",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      ...attemptDeps(),
      fixedTransport: vi.fn(async () => ({})),
      adaptiveExchange: vi.fn(),
    };
    const firstResponse = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), deps);
    const first = await firstResponse.json();
    const acceptedHistory = [{
      questionId: first.decision.nextQuestionId,
      selectedOptionIds: [first.decision.visibleOptionIds[0]],
    }];

    const secondResponse = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: acceptedHistory,
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
    }), deps);
    const second = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(second).toMatchObject({
      journey: { id: "journey-1", route: "fixed", token: expect.any(String) },
      decision: { done: false },
    });
    expect(second.journey.token).not.toBe(first.journey.token);
    expect(deps.fixedTransport).toHaveBeenCalledTimes(2);
  });

  it("keeps an Adaptive Journey sticky after deployment exposure drops to zero", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>();
    const adaptiveExchange = vi.fn<JourneyTurnRuntimeDeps["adaptiveExchange"]>(async () => ({
      kind: "network",
      reason: "network_error",
    }));
    const baseDeps: JourneyTurnRuntimeDeps = {
      secret: SECRET,
      release: "release-a",
      exposure: "100",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-adaptive",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange,
    };
    const firstResponse = await handleJourneyTurnRequest(request({
      subjectBrief: "雨夜女侦探小说封面",
      history: [],
      precision: "simple",
    }), baseDeps);
    const first = await firstResponse.json();
    const history = [{
      questionId: first.decision.nextQuestionId,
      selectedOptionIds: [first.decision.visibleOptionIds[0]],
    }];

    const secondResponse = await handleJourneyTurnRequest(request({
      subjectBrief: "雨夜女侦探小说封面",
      history,
      precision: "simple",
      journeyId: first.journey.id,
      journeyToken: first.journey.token,
    }), { ...baseDeps, exposure: "0" });
    const second = await secondResponse.json();

    expect(first.journey.route).toBe("adaptive");
    expect(secondResponse.status).toBe(200);
    expect(second.journey.route).toBe("adaptive");
    expect(adaptiveExchange).toHaveBeenCalledTimes(2);
    expect(fixedTransport).not.toHaveBeenCalled();
  });

  it("rejects expired, tampered, cross-Journey, stale, skipped, and regressed state before provider execution", async () => {
    const cases = ["expired", "tampered", "cross", "stale", "skipped", "regressed"] as const;
    for (const kind of cases) {
      let now = 1_700_000_000_000;
      const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>(async () => ({}));
      const deps: JourneyTurnRuntimeDeps = {
        secret: SECRET,
        release: "release-a",
        exposure: "0",
        demoKey: "server-key",
        now: () => now,
        newJourneyId: () => "journey-1",
        ...attemptDeps(),
        fixedTransport,
        adaptiveExchange: vi.fn(),
      };
      const first = await (await handleJourneyTurnRequest(request({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
      }), deps)).json();
      const validAnswer = {
        questionId: first.decision.nextQuestionId,
        selectedOptionIds: [first.decision.visibleOptionIds[0]],
      };
      let journeyId = first.journey.id;
      let journeyToken = first.journey.token as string;
      let history = [validAnswer];
      if (kind === "expired") now += 30 * 60 * 1000;
      if (kind === "tampered") {
        journeyToken = `${journeyToken.slice(0, -1)}${journeyToken.endsWith("a") ? "b" : "a"}`;
      }
      if (kind === "cross") journeyId = "journey-2";
      if (kind === "stale") history = [validAnswer, { ...validAnswer, questionId: "scene" }];
      if (kind === "skipped") history = [{ ...validAnswer, questionId: "scene" }];
      if (kind === "regressed") history = [];

      const response = await handleJourneyTurnRequest(request({
        subjectBrief: "原创游侠角色",
        history,
        precision: "simple",
        journeyId,
        journeyToken,
      }), deps);

      expect(response.status, kind).toBe(400);
      expect(await response.json(), kind).toEqual({ error: "invalid_journey_state" });
      expect(fixedTransport, kind).toHaveBeenCalledTimes(1);
    }
  });

  it("applies the 10 and 50 percent thresholds to the same release and Journey ID", async () => {
    const run = async (exposure: "10" | "50") => {
      const response = await handleJourneyTurnRequest(request({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
      }), {
        secret: SECRET,
        release: "release-a",
        exposure,
        demoKey: "server-key",
        now: () => 1_700_000_000_000,
        newJourneyId: () => "journey-0",
        ...attemptDeps(),
        fixedTransport: async () => ({}),
        adaptiveExchange: async () => ({ kind: "network", reason: "network_error" }),
      });
      return response.json() as Promise<{ journey: { route: string } }>;
    };

    expect((await run("10")).journey.route).toBe("fixed");
    expect((await run("50")).journey.route).toBe("adaptive");
  });

  it("rejects unsupported exposure before either provider path", async () => {
    const fixedTransport = vi.fn<JourneyTurnRuntimeDeps["fixedTransport"]>();
    const adaptiveExchange = vi.fn<JourneyTurnRuntimeDeps["adaptiveExchange"]>();
    const response = await handleJourneyTurnRequest(request({
      subjectBrief: "原创游侠角色",
      history: [],
      precision: "simple",
    }), {
      secret: SECRET,
      release: "release-a",
      exposure: "25",
      demoKey: "server-key",
      now: () => 1_700_000_000_000,
      newJourneyId: () => "journey-1",
      ...attemptDeps(),
      fixedTransport,
      adaptiveExchange,
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "invalid_journey_exposure" });
    expect(fixedTransport).not.toHaveBeenCalled();
    expect(adaptiveExchange).not.toHaveBeenCalled();
  });
});
