import "@/lib/prompt/init";
import { describe, expect, it, vi } from "vitest";
import {
  handleJourneyTurnRequest,
  type JourneyTurnRuntimeDeps,
} from "./journey-turn-runtime";

const SECRET = "a-strong-test-secret-with-at-least-32-bytes";

function request(body: unknown): Request {
  return new Request("http://localhost/api/journey-turn", {
    method: "POST",
    headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Built-in Journey HTTP boundary", () => {
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

  it.each(["10", "50"])("assigns repeatable cohorts at %s percent exposure", async (exposure) => {
    const run = async () => {
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
        newJourneyId: () => "repeatable-journey",
        fixedTransport: async () => ({}),
        adaptiveExchange: async () => ({ kind: "network", reason: "network_error" }),
      });
      return response.json() as Promise<{ journey: { route: string } }>;
    };

    expect((await run()).journey.route).toBe((await run()).journey.route);
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
      fixedTransport,
      adaptiveExchange,
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "invalid_journey_exposure" });
    expect(fixedTransport).not.toHaveBeenCalled();
    expect(adaptiveExchange).not.toHaveBeenCalled();
  });
});
