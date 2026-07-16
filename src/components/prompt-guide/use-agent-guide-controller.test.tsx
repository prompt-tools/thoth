import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  requestAdaptiveTurn: vi.fn(),
}));

vi.mock("@/lib/prompt/agent/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/prompt/agent/client")>(),
  requestAdaptiveTurn: clientMocks.requestAdaptiveTurn,
}));

describe("useAgentGuideController Adaptive answer lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AGENT_DEMO_BUILTIN", "1");
    vi.stubEnv("NEXT_PUBLIC_ADAPTIVE_ROUTING", "1");
    clientMocks.requestAdaptiveTurn.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lets free text override selected cards and retries the same pending signed answer", async () => {
    const framingIds = [
      "image_framing:close_up",
      "image_framing:medium_shot",
      "image_framing:full_body",
    ];
    clientMocks.requestAdaptiveTurn
      .mockResolvedValueOnce({
        decision: {
          nextQuestionId: "framing",
          questionText: "取景范围？",
          helperText: "决定人物与背景的比例。",
          visibleOptionIds: framingIds,
          done: false,
        },
        diagnostics: { source: "model" },
        turnToken: "signed-turn-1",
      })
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce({
        decision: {
          nextQuestionId: "camera",
          questionText: "镜头语言？",
          helperText: "决定透视与空间感。",
          visibleOptionIds: [
            "image_camera:35mm_wide",
            "image_camera:50mm_natural",
            "image_camera:85mm_portrait",
          ],
          done: false,
        },
        diagnostics: { source: "model" },
        turnToken: "signed-turn-2",
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

    const pendingInput = clientMocks.requestAdaptiveTurn.mock.calls[1][1];
    expect(pendingInput).toMatchObject({
      turnToken: "signed-turn-1",
      history: [{
        questionId: "framing",
        selectedOptionIds: [],
        freeText: "人物占画面三分之一，保留窗景",
      }],
    });
    expect(result.current.history).toEqual([]);

    act(() => result.current.retryStep());
    await waitFor(() => expect(result.current.decision?.nextQuestionId).toBe("camera"));

    expect(clientMocks.requestAdaptiveTurn.mock.calls[2][1]).toEqual(pendingInput);
    expect(result.current.history).toEqual(pendingInput.history);
  });
});
