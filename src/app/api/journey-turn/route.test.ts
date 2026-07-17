import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/journey-turn", () => {
  it("wires zero exposure to the existing fixed DeepSeek path", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn().mockImplementation(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief: "原创游侠角色",
        history: [],
        precision: "simple",
      }),
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.journey).toMatchObject({ route: "fixed", token: expect.any(String) });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.deepseek.com/chat/completions");
  });

  it("continues a fixed Journey through the production route with its latest token", async () => {
    vi.stubEnv("ADAPTIVE_TURN_SECRET", "a-strong-test-secret-with-at-least-32-bytes");
    vi.stubEnv("JOURNEY_RELEASE", "release-a");
    vi.stubEnv("ADAPTIVE_CANARY_EXPOSURE", "0");
    vi.stubEnv("DEMO_DEEPSEEK_KEY", "server-key");
    const fetchSpy = vi.fn().mockImplementation(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    const subjectBrief = "原创游侠角色";
    const first = await (await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({ subjectBrief, history: [], precision: "simple" }),
    }))).json();
    const history = [{
      questionId: first.decision.nextQuestionId,
      selectedOptionIds: [first.decision.visibleOptionIds[0]],
    }];

    const response = await POST(new Request("http://localhost/api/journey-turn", {
      method: "POST",
      headers: { authorization: "Bearer __demo__", "content-type": "application/json" },
      body: JSON.stringify({
        subjectBrief,
        history,
        precision: "simple",
        journeyId: first.journey.id,
        journeyToken: first.journey.token,
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      journey: { id: first.journey.id, route: "fixed", token: expect.any(String) },
      decision: { done: false },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
