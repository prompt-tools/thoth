import { describe, expect, it } from "vitest";
import { issueAcceptedAskToken, verifySubmittedTurnState } from "./adaptive-turn-state";

const base = {
  secret: "a-strong-test-secret-with-at-least-32-bytes",
  subjectBrief: "雨夜女侦探",
  history: [],
  questionId: "framing",
  optionIds: ["close", "medium", "wide"],
  mode: "single" as const,
};

function input(answer: { selectedOptionIds: string[]; freeText?: string }) {
  return {
    subjectBrief: base.subjectBrief,
    history: [{ questionId: base.questionId, ...answer }],
    turnToken: issueAcceptedAskToken(base),
  };
}

describe("Adaptive accepted-Ask state", () => {
  it("rejects multiple answers for a signed single-select Ask", () => {
    expect(() => verifySubmittedTurnState(base.secret, input({ selectedOptionIds: ["close", "medium"] })))
      .toThrow("invalid_turn_state");
  });

  it("rejects duplicate option IDs", () => {
    const multi = { ...base, mode: "multi" as const };
    const value = {
      subjectBrief: multi.subjectBrief,
      history: [{ questionId: multi.questionId, selectedOptionIds: ["close", "close"] }],
      turnToken: issueAcceptedAskToken(multi),
    };
    expect(() => verifySubmittedTurnState(multi.secret, value)).toThrow("invalid_turn_state");
  });

  it("rejects split-brain Free text plus selected options", () => {
    expect(() => verifySubmittedTurnState(base.secret, input({
      selectedOptionIds: ["close"],
      freeText: "只拍眼睛",
    }))).toThrow("invalid_turn_state");
  });

  it("accepts one allowlisted single-select answer", () => {
    expect(() => verifySubmittedTurnState(base.secret, input({ selectedOptionIds: ["close"] }))).not.toThrow();
  });
});
