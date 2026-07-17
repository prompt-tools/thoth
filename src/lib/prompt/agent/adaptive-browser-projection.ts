import type { AdaptiveTurnResult } from "./adaptive-turn";
import type {
  CatalogDimension,
  CatalogManifest,
  CatalogOption,
} from "./catalog-manifest";

type AdaptiveDiagnostics = AdaptiveTurnResult["diagnostics"];

export class AdaptiveRouteError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    options: { status?: number | null; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "AdaptiveRouteError";
    this.code = code;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export interface AdaptiveBrowserAskProjection {
  kind: "ask";
  phase: "asking";
  decision: AdaptiveTurnResult["decision"];
  diagnostics: AdaptiveDiagnostics;
  turnToken: string;
  dimension: CatalogDimension;
  optionIds: string[];
  options: CatalogOption[];
  freeTextAvailable: true;
}

export interface AdaptiveBrowserCompletionProjection {
  kind: "completion";
  phase: "done";
  decision: AdaptiveTurnResult["decision"];
  diagnostics: AdaptiveDiagnostics;
  optionIds: [];
  options: [];
  freeTextAvailable: false;
}

export type AdaptiveBrowserTurnProjection =
  | AdaptiveBrowserAskProjection
  | AdaptiveBrowserCompletionProjection;

export interface AdaptiveBrowserErrorProjection {
  kind: "error";
  phase: "error";
  code: string;
  status: number | null;
  message: string;
  retryable: boolean;
}

function invalidPayload(message = "自适应服务返回了无效结果，请重试。"): never {
  throw new AdaptiveRouteError("adaptive_route_invalid_payload", message, { retryable: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string"
    && [...value.trim()].length >= 1
    && [...value.trim()].length <= 200;
}

/** Parse the successful route payload without trusting a TypeScript assertion.
 * The server response is a browser trust boundary, so extra or missing fields
 * fail closed before any token or Journey state can be committed. */
export function parseAdaptiveRouteSuccess(payload: unknown): AdaptiveTurnResult {
  if (!isRecord(payload)) invalidPayload();
  if (!isRecord(payload.decision) || !isRecord(payload.diagnostics)) invalidPayload();
  const decision = payload.decision;
  const diagnostics = payload.diagnostics;

  if (!hasExactKeys(decision, [
    "nextQuestionId",
    "questionText",
    "helperText",
    "visibleOptionIds",
    "done",
  ])) invalidPayload();
  if (!Array.isArray(decision.visibleOptionIds)
    || decision.visibleOptionIds.some((id) => typeof id !== "string")) invalidPayload();

  const source = diagnostics.source;
  if (source !== "model" && source !== "fallback" && source !== "remainingEmpty") invalidPayload();
  const expectedDiagnosticKeys = source === "fallback" ? ["source", "reason"] : ["source"];
  if (!hasExactKeys(diagnostics, expectedDiagnosticKeys)) invalidPayload();
  if (source === "fallback" && !isBoundedText(diagnostics.reason)) invalidPayload();

  if (decision.done === true) {
    if (!hasExactKeys(payload, ["decision", "diagnostics"])) invalidPayload();
    if (decision.nextQuestionId !== null
      || decision.questionText !== null
      || decision.helperText !== null
      || decision.visibleOptionIds.length !== 0
      || source === "fallback") invalidPayload();
    return {
      decision: {
        nextQuestionId: null,
        questionText: null,
        helperText: null,
        visibleOptionIds: [],
        done: true,
      },
      diagnostics: { source },
    };
  }

  if (decision.done !== false
    || source === "remainingEmpty"
    || !hasExactKeys(payload, ["decision", "diagnostics", "turnToken"])
    || typeof payload.turnToken !== "string"
    || !payload.turnToken
    || typeof decision.nextQuestionId !== "string"
    || !decision.nextQuestionId
    || !isBoundedText(decision.questionText)
    || !isBoundedText(decision.helperText)) invalidPayload();

  return {
    decision: {
      nextQuestionId: decision.nextQuestionId,
      questionText: decision.questionText,
      helperText: decision.helperText,
      visibleOptionIds: [...decision.visibleOptionIds] as string[],
      done: false,
    },
    diagnostics: source === "fallback"
      ? { source, reason: diagnostics.reason as string }
      : { source },
    turnToken: payload.turnToken,
  };
}

/** Convert an accepted route result into the exact surface the browser may
 * render. Catalog resolution preserves server order and never drops a bad ID. */
export function projectAdaptiveTurnForBrowser(
  payload: unknown,
  manifest: CatalogManifest,
): AdaptiveBrowserTurnProjection {
  const result = parseAdaptiveRouteSuccess(payload);
  const { decision } = result;
  if (decision.done) {
    return {
      kind: "completion",
      phase: "done",
      decision,
      diagnostics: result.diagnostics,
      optionIds: [],
      options: [],
      freeTextAvailable: false,
    };
  }

  const optionIds = decision.visibleOptionIds;
  if (optionIds.length < 3
    || optionIds.length > 6
    || new Set(optionIds).size !== optionIds.length) {
    throw new AdaptiveRouteError(
      "adaptive_browser_option_cardinality",
      "自适应结果的选项数量无效，请重试。",
      { retryable: true },
    );
  }

  const dimension = manifest.find((item) => item.questionId === decision.nextQuestionId);
  if (!dimension || dimension.questionId === "subject") {
    throw new AdaptiveRouteError(
      "adaptive_browser_dimension_missing",
      "自适应结果包含未知问题，请重试。",
      { retryable: true },
    );
  }
  const optionMap = new Map(dimension.options.map((option) => [option.id, option]));
  const options = optionIds.map((id) => optionMap.get(id));
  if (options.some((option) => !option)) {
    throw new AdaptiveRouteError(
      "adaptive_browser_option_missing",
      "自适应结果包含未知选项，请重试。",
      { retryable: true },
    );
  }

  return {
    kind: "ask",
    phase: "asking",
    decision,
    diagnostics: result.diagnostics,
    turnToken: result.turnToken!,
    dimension,
    optionIds: [...optionIds],
    options: options as CatalogOption[],
    freeTextAvailable: true,
  };
}

/** Shared hard-error projection for the UI and deterministic replay evidence. */
export function projectAdaptiveErrorForBrowser(error: unknown): AdaptiveBrowserErrorProjection {
  if (error instanceof AdaptiveRouteError) {
    return {
      kind: "error",
      phase: "error",
      code: error.code,
      status: error.status,
      message: error.message,
      retryable: error.retryable,
    };
  }
  const message = error instanceof Error && error.message
    ? error.message
    : "自适应请求失败，请重试。";
  return {
    kind: "error",
    phase: "error",
    code: "adaptive_route_failed",
    status: null,
    message,
    retryable: true,
  };
}
