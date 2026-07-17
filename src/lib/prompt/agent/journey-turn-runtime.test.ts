import "@/lib/prompt/init";
import { describe, expect, it, vi } from "vitest";
import {
  handleJourneyTurnRequest,
  type JourneyTurnRuntimeDeps,
} from "./journey-turn-runtime";
import { buildTurnRequest, ProviderTransportError } from "./client";
import { buildAdaptiveTurnSnapshot } from "./adaptive-turn";
import { buildCatalogManifest } from "./catalog-manifest";
import { getProvider } from "./providers";

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
