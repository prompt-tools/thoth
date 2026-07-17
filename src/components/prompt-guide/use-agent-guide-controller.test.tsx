import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  requestAdaptiveTurn: vi.fn(),
  requestJourneyTurn: vi.fn(),
}));

vi.mock("@/lib/prompt/agent/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/prompt/agent/client")>(),
  requestAdaptiveTurn: clientMocks.requestAdaptiveTurn,
  requestJourneyTurn: clientMocks.requestJourneyTurn,
}));

describe("useAgentGuideController Adaptive answer lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AGENT_DEMO_BUILTIN", "1");
    vi.stubEnv("NEXT_PUBLIC_ADAPTIVE_ROUTING", "1");
    clientMocks.requestAdaptiveTurn.mockReset();
    clientMocks.requestJourneyTurn.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
});

describe("useAgentGuideController Built-in Journey routing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AGENT_DEMO_BUILTIN", "1");
    vi.stubEnv("NEXT_PUBLIC_ADAPTIVE_ROUTING", "1");
    clientMocks.requestAdaptiveTurn.mockReset();
    clientMocks.requestJourneyTurn.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).not.toHaveProperty("journeyId");
    expect(clientMocks.requestJourneyTurn.mock.calls[2][0]).not.toHaveProperty("journeyToken");
  });
});
