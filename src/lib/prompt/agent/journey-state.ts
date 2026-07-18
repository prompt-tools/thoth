import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AgentHistoryItem } from "./decision";
import type { Precision } from "./gradient";

export type JourneyRoute = "fixed" | "adaptive";
export const RAW_CONTENT_CONSENT_VERSION = 1 as const;

export interface JourneyConsent {
  version: typeof RAW_CONTENT_CONSENT_VERSION;
  acceptedAt: number;
}

export interface JourneyAskState {
  kind: "ask";
  questionId: string;
  optionIds: string[];
  mode: "single" | "multi" | "free_text";
  maxSelections?: number;
}

export interface JourneyClaims {
  version: 1;
  journeyId: string;
  release: string;
  route: JourneyRoute;
  turn: number;
  subjectHash: string;
  historyHash: string;
  precision: Precision;
  state: JourneyAskState | { kind: "done" };
  issuedAt: number;
  consent: JourneyConsent | null;
  rawContentSampled: boolean;
  expiresAt: number;
}

const INVALID = "invalid_journey_state";
const MAX_TOKEN_BYTES = 8 * 1024;

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function historyDigest(history: AgentHistoryItem[]): string {
  return digest(JSON.stringify(history));
}

function signature(secret: string, encodedPayload: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest();
}

function decodeCanonicalBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error(INVALID);
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw new Error(INVALID);
  return decoded;
}

export function parseJourneyExposure(value: string | undefined): 0 | 10 | 50 | 100 {
  if (value === "0") return 0;
  if (value === "10") return 10;
  if (value === "50") return 50;
  if (value === "100") return 100;
  throw new Error("invalid_journey_exposure");
}

export function assignJourneyRoute(
  release: string,
  journeyId: string,
  exposure: 0 | 10 | 50 | 100,
): JourneyRoute {
  if (exposure === 0) return "fixed";
  if (exposure === 100) return "adaptive";
  const bucket = createHash("sha256")
    .update(`${release}:${journeyId}`, "utf8")
    .digest()
    .readUInt32BE(0) % 100;
  return bucket < exposure ? "adaptive" : "fixed";
}

export function assignRawContentSample(secret: string, release: string, journeyId: string): boolean {
  const bucket = createHmac("sha256", secret)
    .update(`raw-content:${release}:${journeyId}`, "utf8")
    .digest()
    .readUInt32BE(0) % 100;
  return bucket < 20;
}

export function issueJourneyToken(args: {
  secret: string;
  journeyId: string;
  release: string;
  route: JourneyRoute;
  subjectBrief: string;
  history: AgentHistoryItem[];
  precision: Precision;
  state: JourneyClaims["state"];
  consent?: JourneyConsent | null;
  rawContentSampled?: boolean;
  now: number;
}): string {
  const consent = args.consent ?? null;
  const payload: JourneyClaims = {
    version: 1,
    journeyId: args.journeyId,
    release: args.release,
    route: args.route,
    turn: args.history.length,
    subjectHash: digest(args.subjectBrief),
    historyHash: historyDigest(args.history),
    precision: args.precision,
    state: args.state,
    issuedAt: args.now,
    consent,
    rawContentSampled: consent !== null && args.rawContentSampled === true,
    expiresAt: args.now + 30 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(args.secret, encoded).toString("base64url")}`;
}

export function readJourneyToken(secret: string, token: string, now: number): JourneyClaims {
  if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) throw new Error(INVALID);
  const [encoded, encodedSignature, extra] = token.split(".");
  if (!encoded || !encodedSignature || encodedSignature.length !== 43 || extra !== undefined) {
    throw new Error(INVALID);
  }
  let actual: Buffer;
  try {
    actual = decodeCanonicalBase64Url(encodedSignature);
  } catch {
    throw new Error(INVALID);
  }
  const expected = signature(secret, encoded);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error(INVALID);
  let payload: JourneyClaims;
  try {
    const decodedPayload = decodeCanonicalBase64Url(encoded);
    payload = JSON.parse(decodedPayload.toString("utf8")) as JourneyClaims;
  } catch {
    throw new Error(INVALID);
  }
  if (payload.version !== 1
    || !payload.journeyId
    || !payload.release
    || (payload.route !== "fixed" && payload.route !== "adaptive")
    || !Number.isInteger(payload.turn)
    || payload.turn < 0
    || !Number.isFinite(payload.issuedAt)
    || payload.issuedAt > now
    || !Number.isFinite(payload.expiresAt)
    || payload.expiresAt <= payload.issuedAt
    || payload.expiresAt <= now
    || (payload.consent !== null
      && (!payload.consent
        || typeof payload.consent !== "object"
        || Array.isArray(payload.consent)
        || payload.consent.version !== RAW_CONTENT_CONSENT_VERSION
        || !Number.isFinite(payload.consent.acceptedAt)
        || payload.consent.acceptedAt > payload.issuedAt))
    || typeof payload.rawContentSampled !== "boolean"
    || (payload.consent === null && payload.rawContentSampled)
    || (payload.precision !== "simple" && payload.precision !== "standard" && payload.precision !== "detailed")
    || !payload.state
    || (payload.state.kind !== "ask" && payload.state.kind !== "done")) {
    throw new Error(INVALID);
  }
  return payload;
}

export function matchesJourneySnapshot(
  claims: JourneyClaims,
  subjectBrief: string,
  history: AgentHistoryItem[],
  precision: Precision,
): boolean {
  return claims.subjectHash === digest(subjectBrief)
    && claims.historyHash === historyDigest(history)
    && claims.precision === precision;
}
