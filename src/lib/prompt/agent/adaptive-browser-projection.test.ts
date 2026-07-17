import "@/lib/prompt/init";
import { describe, expect, it } from "vitest";
import { buildCatalogManifest } from "./catalog-manifest";
import {
  AdaptiveRouteError,
  parseAdaptiveRouteSuccess,
  projectAdaptiveErrorForBrowser,
  projectAdaptiveTurnForBrowser,
} from "./adaptive-browser-projection";

const manifest = buildCatalogManifest();
const framingIds = [
  "image_framing:close_up",
  "image_framing:medium_shot",
  "image_framing:wide_shot",
];

function askPayload(optionIds = framingIds) {
  return {
    decision: {
      nextQuestionId: "framing",
      questionText: "取景范围？",
      helperText: "决定人物与背景的比例。",
      visibleOptionIds: optionIds,
      done: false,
    },
    diagnostics: { source: "model" },
    turnToken: "signed-turn",
  };
}

describe("Adaptive browser projection", () => {
  it("preserves a valid Ask's exact catalog order and free-text path", () => {
    const projection = projectAdaptiveTurnForBrowser(askPayload(), manifest);

    expect(projection).toMatchObject({
      kind: "ask",
      phase: "asking",
      optionIds: framingIds,
      freeTextAvailable: true,
      turnToken: "signed-turn",
    });
    if (projection.kind !== "ask") throw new Error("expected Ask");
    expect(projection.options.map((option) => option.id)).toEqual(framingIds);
  });

  it("fails closed instead of dropping an unknown option ID", () => {
    expect(() => projectAdaptiveTurnForBrowser(askPayload([
      framingIds[0],
      "image_framing:missing",
      framingIds[2],
    ]), manifest)).toThrowError(expect.objectContaining({
      name: "AdaptiveRouteError",
      code: "adaptive_browser_option_missing",
    }));
  });

  it.each([
    ["two options", framingIds.slice(0, 2), "adaptive_browser_option_cardinality"],
    ["duplicate options", [framingIds[0], framingIds[0], framingIds[1]], "adaptive_browser_option_cardinality"],
    [
      "another dimension's option",
      [framingIds[0], framingIds[1], "image_camera:35mm_wide"],
      "adaptive_browser_option_missing",
    ],
  ])("rejects %s", (_label, optionIds, code) => {
    expect(() => projectAdaptiveTurnForBrowser(askPayload(optionIds), manifest)).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it("accepts only the exact nullable Completion shape", () => {
    const projection = projectAdaptiveTurnForBrowser({
      decision: {
        nextQuestionId: null,
        questionText: null,
        helperText: null,
        visibleOptionIds: [],
        done: true,
      },
      diagnostics: { source: "remainingEmpty" },
    }, manifest);

    expect(projection).toEqual(expect.objectContaining({
      kind: "completion",
      phase: "done",
      optionIds: [],
      freeTextAvailable: false,
    }));
    expect(() => parseAdaptiveRouteSuccess({
      ...askPayload(),
      decision: { ...askPayload().decision, helperText: null },
    })).toThrowError(expect.objectContaining({ code: "adaptive_route_invalid_payload" }));
  });

  it("projects typed and unknown hard errors through one browser shape", () => {
    const typed = projectAdaptiveErrorForBrowser(new AdaptiveRouteError(
      "http_503",
      "503: upstream unavailable",
      { status: 503, retryable: true },
    ));
    const unknown = projectAdaptiveErrorForBrowser(new Error("temporary network failure"));

    expect(typed).toEqual({
      kind: "error",
      phase: "error",
      code: "http_503",
      status: 503,
      message: "503: upstream unavailable",
      retryable: true,
    });
    expect(unknown).toMatchObject({
      kind: "error",
      phase: "error",
      code: "adaptive_route_failed",
      message: "temporary network failure",
    });
  });
});
