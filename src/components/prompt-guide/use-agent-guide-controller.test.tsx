import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  requestAdaptiveTurn: vi.fn(),
  requestJourneyTurn: vi.fn(),
  autoFillDimensions: vi.fn(),
  polishPrompt: vi.fn(),
}));

vi.mock("@/lib/prompt/agent/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/prompt/agent/client")>(),
  requestAdaptiveTurn: clientMocks.requestAdaptiveTurn,
  requestJourneyTurn: clientMocks.requestJourneyTurn,
  autoFillDimensions: clientMocks.autoFillDimensions,
  polishPrompt: clientMocks.polishPrompt,
}));

describe("useAgentGuideController Adaptive answer lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AGENT_DEMO_BUILTIN", "1");
    vi.stubEnv("NEXT_PUBLIC_ADAPTIVE_ROUTING", "1");
    clientMocks.requestAdaptiveTurn.mockReset();
    clientMocks.requestJourneyTurn.mockReset();
    clientMocks.autoFillDimensions.mockReset().mockResolvedValue([]);
    clientMocks.polishPrompt.mockReset().mockResolvedValue({ zh: "润色中文", en: "polished English" });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("lets free text override selected cards and retries the same pending signed answer", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-turn-1" },
        decision: {
          nextQuestionId: "framing",
          questionText: "取景范围？",
          helperText: "决定人物与背景的比例。",
          visibleOptionIds: framingIds,
          done: false,
        },
        diagnostics: { source: "model" },
      })
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-turn-2" },
        decision: {
          nextQuestionId: "camera",
          questionText: "镜头语言？",
          helperText: "决定透视与空间感。",
          visibleOptionIds: [
            "image_camera:35mm_wide",
            "image_camera:50mm_standard",
            "image_camera:85mm_portrait",
          ],
          done: false,
        },
        diagnostics: { source: "model" },
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    expect(result.current.adaptiveRouting).toBe(false);
    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));

    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.setDraftText("人物占画面三分之一，保留窗景"));
    await waitFor(() => expect(result.current.draftText).toContain("三分之一"));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.error).toBe("temporary network failure"));

    const pendingInput = clientMocks.requestJourneyTurn.mock.calls[1][0];
    expect(pendingInput).toMatchObject({
      journeyId: "journey-1",
      journeyToken: "signed-turn-1",
      history: [{
        questionId: "framing",
        selectedOptionIds: [],
        freeText: "人物占画面三分之一，保留窗景",
      }],
    });
    expect(result.current.history).toEqual([]);

    act(() => result.current.retryStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));

    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toEqual(pendingInput);
    expect(result.current.history).toEqual(pendingInput.history);
  });

  it("does not commit an answer or replacement token when browser projection rejects a success payload", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-turn-1" },
        decision: {
          nextQuestionId: "framing",
          questionText: "取景范围？",
          helperText: "决定人物与背景的比例。",
          visibleOptionIds: framingIds,
          done: false,
        },
        diagnostics: { source: "model" },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "untrusted-turn-2" },
        decision: {
          nextQuestionId: "camera",
          questionText: "镜头语言？",
          helperText: "决定透视与空间感。",
          visibleOptionIds: [
            "image_camera:35mm_wide",
            "image_camera:missing",
            "image_camera:85mm_portrait",
          ],
          done: false,
        },
        diagnostics: { source: "model" },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-turn-2" },
        decision: {
          nextQuestionId: "camera",
          questionText: "镜头语言？",
          helperText: "决定透视与空间感。",
          visibleOptionIds: [
            "image_camera:35mm_wide",
            "image_camera:50mm_standard",
            "image_camera:85mm_portrait",
          ],
          done: false,
        },
        diagnostics: { source: "model" },
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));

    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.error).toContain("未知选项"));
    expect(result.current.history).toEqual([]);

    act(() => result.current.retryStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));

    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({
      journeyId: "journey-1",
      journeyToken: "signed-turn-1",
      history: [{ questionId: "framing", selectedOptionIds: [framingIds[0]] }],
    });
  });

  it("gets a signed Done token when the user finishes an Adaptive Journey early", async () => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: vi.fn(() => true) });
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    const cameraIds = [
      "image_camera:35mm_wide",
      "image_camera:50mm_standard",
      "image_camera:85mm_portrait",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-turn-1" },
        decision: {
          nextQuestionId: "framing",
          questionText: "取景范围？",
          helperText: "决定人物与背景的比例。",
          visibleOptionIds: framingIds,
          done: false,
        },
        diagnostics: { source: "model" },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-turn-2" },
        decision: {
          nextQuestionId: "camera",
          questionText: "镜头语言？",
          helperText: "决定透视与空间感。",
          visibleOptionIds: cameraIds,
          done: false,
        },
        diagnostics: { source: "model" },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "adaptive", token: "signed-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));
    await act(async () => { await result.current.finishNow(); });

    expect(result.current.phase).toBe("done");
    expect(clientMocks.autoFillDimensions).not.toHaveBeenCalled();
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({
      complete: true,
      journeyId: "journey-1",
      journeyToken: "signed-turn-2",
      history: [{ questionId: "framing", selectedOptionIds: [framingIds[0]] }],
    });
  });
});

describe("useAgentGuideController Built-in Journey routing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AGENT_DEMO_BUILTIN", "1");
    vi.stubEnv("NEXT_PUBLIC_ADAPTIVE_ROUTING", "1");
    clientMocks.requestAdaptiveTurn.mockReset();
    clientMocks.requestJourneyTurn.mockReset();
    clientMocks.autoFillDimensions.mockReset().mockResolvedValue([]);
    clientMocks.polishPrompt.mockReset().mockResolvedValue({ zh: "润色中文", en: "polished English" });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("carries the latest token while obeying the server-selected fixed route", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: {
          nextQuestionId: "framing",
          visibleOptionIds: framingIds,
          done: false,
        },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: {
          nextQuestionId: "camera",
          visibleOptionIds: [
            "image_camera:35mm_wide",
            "image_camera:50mm_standard",
            "image_camera:85mm_portrait",
          ],
          done: false,
        },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-2", route: "fixed", token: "journey-token-new" },
        decision: {
          nextQuestionId: "framing",
          visibleOptionIds: framingIds,
          done: false,
        },
        diagnostics: { source: "ordered", fallbackUsed: false },
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    expect(result.current.adaptiveRouting).toBe(false);
    const firstJourneyRequestId = clientMocks.requestJourneyTurn.mock.calls[0][0].journeyRequestId;
    expect(firstJourneyRequestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(clientMocks.requestJourneyTurn.mock.calls[0][0]).toMatchObject({
      journeyRequestId: firstJourneyRequestId,
      rawContentConsent: false,
    });
    expect(clientMocks.requestJourneyTurn.mock.calls[0][0]).not.toHaveProperty("journeyId");

    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));

    expect(clientMocks.requestJourneyTurn.mock.calls[1][0]).toMatchObject({
      journeyId: "journey-1",
      journeyToken: "journey-token-1",
      history: [{ questionId: "framing", selectedOptionIds: [framingIds[0]] }],
    });
    expect(clientMocks.requestAdaptiveTurn).not.toHaveBeenCalled();

    act(() => result.current.restart());
    act(() => result.current.startWithDescription("另一位角色"));
    await waitFor(() => expect(clientMocks.requestJourneyTurn).toHaveBeenCalledTimes(3));
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0].journeyRequestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0].journeyRequestId).not.toBe(firstJourneyRequestId);
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).not.toHaveProperty("journeyId");
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).not.toHaveProperty("journeyToken");
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({ rawContentConsent: false });
  });

  it("reuses the client nonce when the first Journey response is lost", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockRejectedValueOnce(new Error("response lost"))
      .mockImplementationOnce(async () => ({
        journey: { id: "server-journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
        rawContentEligible: false,
      }));
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.setRawContentConsent(true));
    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.error).toBe("response lost"));
    const firstInput = clientMocks.requestJourneyTurn.mock.calls[0][0];

    act(() => result.current.retryStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));

    expect(firstInput.journeyRequestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(firstInput).not.toHaveProperty("journeyId");
    expect(clientMocks.requestJourneyTurn.mock.calls[1][0]).toEqual(firstInput);
    expect(firstInput).toMatchObject({ rawContentConsent: true, history: [] });
  });

  it("sends explicit consent only when creating a Journey and resets it on restart", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: "camera", visibleOptionIds: [], done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-2", route: "fixed", token: "journey-token-3" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.setRawContentConsent(true));
    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    expect(clientMocks.requestJourneyTurn.mock.calls[0][0]).toMatchObject({ rawContentConsent: true });

    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(clientMocks.requestJourneyTurn).toHaveBeenCalledTimes(2));
    expect(clientMocks.requestJourneyTurn.mock.calls[1][0]).not.toHaveProperty("rawContentConsent");

    act(() => result.current.restart());
    expect(result.current.rawContentConsent).toBe(false);
    act(() => result.current.startWithDescription("另一位角色"));
    await waitFor(() => expect(clientMocks.requestJourneyTurn).toHaveBeenCalledTimes(3));
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({ rawContentConsent: false });
  });

  it("lets fixed-cohort free text atomically override selected cards", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: {
          nextQuestionId: "camera",
          visibleOptionIds: [
            "image_camera:35mm_wide",
            "image_camera:50mm_standard",
            "image_camera:85mm_portrait",
          ],
          done: false,
        },
        diagnostics: { source: "ordered", fallbackUsed: false },
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.setDraftText("人物占画面三分之一，保留窗景"));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));

    expect(clientMocks.requestJourneyTurn.mock.calls[1][0]).toMatchObject({
      history: [{
        questionId: "framing",
        selectedOptionIds: [],
        freeText: "人物占画面三分之一，保留窗景",
      }],
    });
  });

  it("server-signs the fixed autofill snapshot before raw reporting and polish", async () => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
    const fetchSpy = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json({ ok: true }, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    const cameraId = "image_camera:85mm_portrait";
    clientMocks.autoFillDimensions.mockResolvedValueOnce([{
      questionId: "camera",
      selectedOptionIds: [cameraId],
    }]);
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: "framing", visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: true,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: true,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.setRawContentConsent(true));
    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(clientMocks.autoFillDimensions.mock.calls[0][2]).toMatchObject({
      journey: { id: "journey-1", token: "journey-token-2" },
    });
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({
      complete: true,
      journeyId: "journey-1",
      journeyToken: "journey-token-2",
      history: [
        { questionId: "framing", selectedOptionIds: [framingIds[0]] },
        { questionId: "camera", selectedOptionIds: [cameraId] },
      ],
    });
    await waitFor(() => expect(fetchSpy.mock.calls.some(([url]) => String(url) === "/api/raw-content")).toBe(true));
    const rawCall = fetchSpy.mock.calls.find(([url]) => String(url) === "/api/raw-content")!;
    expect(JSON.parse(String(rawCall[1]?.body))).toMatchObject({
      journeyToken: "journey-token-done",
      history: [
        { questionId: "framing", selectedOptionIds: [framingIds[0]] },
        { questionId: "camera", selectedOptionIds: [cameraId] },
      ],
    });
    expect(rawCall[1]).not.toHaveProperty("keepalive");

    act(() => { void result.current.polish(); });
    await waitFor(() => expect(clientMocks.polishPrompt).toHaveBeenCalledTimes(1));
    expect(clientMocks.polishPrompt.mock.calls[0][2]).toMatchObject({
      journey: { id: "journey-1", token: "journey-token-done" },
    });
  });

  it("submits consented final raw content separately without gating content-free telemetry", async () => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      void _init;
      const url = String(input);
      if (url === "/api/raw-content") return Response.json({ ok: false }, { status: 503 });
      return Response.json({ ok: true }, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: "framing", visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: true,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: true,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.setRawContentConsent(true));
    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.phase).toBe("done"));
    await waitFor(() => expect(fetchSpy.mock.calls.some(([url]) => String(url) === "/api/raw-content")).toBe(true));

    const telemetryCalls = fetchSpy.mock.calls.filter(([url]) => String(url) === "/api/telemetry");
    const rawCalls = fetchSpy.mock.calls.filter(([url]) => String(url) === "/api/raw-content");
    expect(telemetryCalls).toHaveLength(2);
    expect(rawCalls).toHaveLength(2);
    const rawPayload = JSON.parse(String(rawCalls[0][1]?.body));
    expect(rawPayload).toEqual({
      journeyId: "journey-1",
      journeyToken: "journey-token-done",
      subjectBrief: "窗边的女学生",
      history: [{ questionId: "framing", selectedOptionIds: [framingIds[0]] }],
      precision: "simple",
    });
    expect(rawCalls[0][1]).not.toHaveProperty("keepalive");
    expect(result.current.error).toBeNull();
  });

  it.each([
    ["unconsented", false, false],
    ["unsampled or disabled", true, false],
  ])("does not upload raw completion when the Journey is %s", async (_kind, consent, eligible) => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
    const fetchSpy = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json({ ok: true }, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
        rawContentEligible: eligible,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: eligible,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: eligible,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.setRawContentConsent(consent));
    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.phase).toBe("done"));
    await waitFor(() => expect(fetchSpy.mock.calls.some(([url]) => String(url) === "/api/telemetry")).toBe(true));

    expect(fetchSpy.mock.calls.filter(([url]) => String(url) === "/api/raw-content")).toHaveLength(0);
    expect(fetchSpy.mock.calls.filter(([url]) => String(url) === "/api/telemetry").length).toBeGreaterThan(0);
  });

  it.each([
    { action: "submit", eventType: "answer_submitted" },
    { action: "skip", eventType: "turn_skipped" },
  ])("reports $eventType without blocking the Journey when delivery fails", async ({ action, eventType }) => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("telemetry unavailable"));
    vi.stubGlobal("fetch", fetchSpy);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: "framing", visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    if (action === "submit") {
      act(() => result.current.toggleDraft(framingIds[0]));
      act(() => result.current.submitStep());
    } else {
      act(() => result.current.skipStep());
    }

    if (action === "submit") {
      await waitFor(() => expect(result.current.phase).toBe("done"));
    } else {
      await waitFor(() => expect(clientMocks.requestJourneyTurn).toHaveBeenCalledTimes(2));
    }
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(action === "submit" ? 4 : 2));
    const payloads = fetchSpy.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(payloads).toEqual([
      {
        journeyId: "journey-1",
        journeyToken: "journey-token-1",
        eventType,
      },
      {
        journeyId: "journey-1",
        journeyToken: "journey-token-1",
        eventType,
      },
      ...(action === "submit" ? [
        {
          journeyId: "journey-1",
          journeyToken: "journey-token-done",
          eventType: "prompt_rendered",
        },
        {
          journeyId: "journey-1",
          journeyToken: "journey-token-done",
          eventType: "prompt_rendered",
        },
      ] : []),
    ]);
  });

  it("gets a signed Done token when the user finishes a fixed Journey early", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    const cameraId = "image_camera:85mm_portrait";
    clientMocks.autoFillDimensions.mockResolvedValueOnce([{
      questionId: "camera",
      selectedOptionIds: [cameraId],
    }]);
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: "camera", visibleOptionIds: [cameraId], done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));
    await act(async () => { await result.current.finishNow(); });

    expect(result.current.phase).toBe("done");
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({
      complete: true,
      journeyId: "journey-1",
      journeyToken: "journey-token-2",
      history: [
        { questionId: "framing", selectedOptionIds: [framingIds[0]] },
        { questionId: "camera", selectedOptionIds: [cameraId] },
      ],
    });
  });

  it("gets a signed Done token when two fixed fallbacks give up", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "fallback", fallbackUsed: true },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-ask" },
        decision: { nextQuestionId: "camera", visibleOptionIds: [], done: false },
        diagnostics: { source: "fallback", fallbackUsed: true },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.phase).toBe("done"));

    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).toMatchObject({
      complete: true,
      journeyId: "journey-1",
      journeyToken: "journey-token-ask",
      history: [{ questionId: "framing", selectedOptionIds: [framingIds[0]] }],
    });
  });

  it("gets a signed Done token when the fixed H3 ceiling stops routing", async () => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: vi.fn(() => true) });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());
    const dimensions = result.current.manifest
      .filter((dimension: { options: unknown[] }) => dimension.options.length > 0)
      .slice(0, 28);
    expect(dimensions).toHaveLength(28);
    clientMocks.requestJourneyTurn.mockImplementation(async (input: {
      complete?: boolean;
      history: Array<{ questionId: string }>;
    }) => input.complete ? {
      journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
      decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
      diagnostics: { source: "remainingEmpty", fallbackUsed: false },
      rawContentEligible: false,
    } : {
      journey: { id: "journey-1", route: "fixed", token: `journey-token-${input.history.length}` },
      decision: {
        nextQuestionId: dimensions[input.history.length].questionId,
        visibleOptionIds: dimensions[input.history.length].options.slice(0, 3).map((option: { id: string }) => option.id),
        done: false,
      },
      diagnostics: { source: "ordered", fallbackUsed: false },
      rawContentEligible: false,
    });

    act(() => result.current.startWithDescription("窗边的女学生"));
    for (const dimension of dimensions) {
      await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe(dimension.questionId));
      act(() => result.current.skipStep());
    }
    await waitFor(() => expect(result.current.phase).toBe("done"));

    const completionInput = clientMocks.requestJourneyTurn.mock.calls.find(([input]) => input.complete)?.[0];
    expect(completionInput).toMatchObject({
      complete: true,
      journeyId: "journey-1",
      journeyToken: "journey-token-27",
    });
    expect(completionInput!.history).toHaveLength(28);
    expect(result.current.history).toHaveLength(28);
  }, 10_000);

  it.each(["restart", "reconfigure"] as const)("ignores a late polish after %s", async (action) => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:wide_shot",
    ];
    let resolvePolish!: (value: { zh: string; en: string }) => void;
    clientMocks.polishPrompt.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePolish = resolve;
    }));
    clientMocks.requestJourneyTurn
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-1" },
        decision: { nextQuestionId: "framing", visibleOptionIds: framingIds, done: false },
        diagnostics: { source: "ordered", fallbackUsed: false },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-2" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      })
      .mockResolvedValueOnce({
        journey: { id: "journey-1", route: "fixed", token: "journey-token-done" },
        decision: { nextQuestionId: null, visibleOptionIds: [], done: true },
        diagnostics: { source: "remainingEmpty", fallbackUsed: false },
        rawContentEligible: false,
      });
    const { useAgentGuideController } = await import("./use-agent-guide-controller");
    const { result } = renderHook(() => useAgentGuideController());

    act(() => result.current.startWithDescription("窗边的女学生"));
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("framing"));
    act(() => result.current.toggleDraft(framingIds[0]));
    act(() => result.current.submitStep());
    await waitFor(() => expect(result.current.phase).toBe("done"));
    act(() => { void result.current.polish(); });
    await waitFor(() => expect(result.current.polishing).toBe(true));
    act(() => result.current[action]());
    await act(async () => {
      resolvePolish({ zh: "stale", en: "stale" });
      await Promise.resolve();
    });

    expect(result.current.polished).toBeNull();
    expect(result.current.polishing).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
