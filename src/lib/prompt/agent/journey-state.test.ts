import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { issueJourneyToken, readJourneyToken } from "./journey-state";

const SECRET = "a-strong-test-secret-with-at-least-32-bytes";
const NOW = 1_700_000_000_000;

function token(): string {
  return issueJourneyToken({
    secret: SECRET,
    journeyId: "journey-1",
    release: "release-a",
    route: "fixed",
    subjectBrief: "雨夜女侦探",
    history: [],
    precision: "simple",
    state: { kind: "done" },
    now: NOW,
  });
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", SECRET).update(encodedPayload, "utf8").digest("base64url");
}

function withPayload(encodedPayload: string): string {
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function alternateTrailingBits(value: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const index = alphabet.indexOf(value.at(-1) ?? "");
  if (index < 0) throw new Error("test fixture is not base64url");
  const unusedBits = value.length % 4 === 2 ? 4 : value.length % 4 === 3 ? 2 : 0;
  if (unusedBits === 0) return `${value}=`;
  const mask = (1 << unusedBits) - 1;
  return `${value.slice(0, -1)}${alphabet[(index & ~mask) | ((index + 1) & mask)]}`;
}

describe("Journey token encoding", () => {
  it("accepts a valid signed token", () => {
    expect(readJourneyToken(SECRET, token(), NOW)).toMatchObject({ journeyId: "journey-1" });
  });

  it("rejects an oversized token before verification", () => {
    const [, encodedSignature] = token().split(".");
    expect(() => readJourneyToken(SECRET, `${"A".repeat(8 * 1024)}.${encodedSignature}`, NOW))
      .toThrow("invalid_journey_state");
  });

  it.each(["!", " ", "="])(
    "rejects a non-canonical signature ending in %s",
    (suffix) => {
      const [encoded, encodedSignature] = token().split(".");
      expect(() => readJourneyToken(SECRET, `${encoded}.${encodedSignature}${suffix}`, NOW))
        .toThrow("invalid_journey_state");
    },
  );

  it("rejects a signature with non-zero unused trailing bits", () => {
    const [encoded, encodedSignature] = token().split(".");
    expect(() => readJourneyToken(SECRET, `${encoded}.${alternateTrailingBits(encodedSignature)}`, NOW))
      .toThrow("invalid_journey_state");
  });

  it.each(["!", " ", "="])(
    "rejects a non-canonical payload ending in %s even with a matching signature",
    (suffix) => {
      const [encoded] = token().split(".");
      expect(() => readJourneyToken(SECRET, withPayload(`${encoded}${suffix}`), NOW))
        .toThrow("invalid_journey_state");
    },
  );
});
