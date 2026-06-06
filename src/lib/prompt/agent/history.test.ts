import { describe, it, expect } from "vitest";
import "../init";
import { selectionValueFor, appendAnswer, buildRenderInputs } from "./history";
import { buildCatalogManifest } from "./catalog-manifest";
import type { AgentHistoryItem } from "./decision";

const manifest = buildCatalogManifest();

describe("selectionValueFor", () => {
  it("single mode returns the first id", () => {
    expect(selectionValueFor("single", ["a", "b"])).toBe("a");
  });

  it("single mode with one id returns that id", () => {
    expect(selectionValueFor("single", ["only"])).toBe("only");
  });

  it("single mode with empty array returns undefined", () => {
    expect(selectionValueFor("single", [])).toBeUndefined();
  });

  it("multi mode returns the full array", () => {
    expect(selectionValueFor("multi", ["a", "b"])).toEqual(["a", "b"]);
  });

  it("multi mode with empty array returns undefined", () => {
    expect(selectionValueFor("multi", [])).toBeUndefined();
  });

  it("free_text mode with empty array returns undefined", () => {
    expect(selectionValueFor("free_text", [])).toBeUndefined();
  });
});

describe("appendAnswer", () => {
  it("appends a new answer to empty history", () => {
    const result = appendAnswer([], "subject", ["opt1"]);
    expect(result).toEqual([{ questionId: "subject", selectedOptionIds: ["opt1"], freeText: undefined }]);
  });

  it("replaces an existing answer with the same questionId", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["old"] },
      { questionId: "scene", selectedOptionIds: ["s1"] },
    ];
    const result = appendAnswer(history, "subject", ["new1", "new2"]);
    expect(result).toHaveLength(2);
    expect(result.find((h) => h.questionId === "subject")!.selectedOptionIds).toEqual(["new1", "new2"]);
  });

  it("does not stack duplicate questionIds", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: ["a"] },
    ];
    const result = appendAnswer(history, "subject", ["b"]);
    const subjects = result.filter((h) => h.questionId === "subject");
    expect(subjects).toHaveLength(1);
  });

  it("stores freeText when provided", () => {
    const result = appendAnswer([], "subject", [], "custom text");
    expect(result[0].freeText).toBe("custom text");
  });

  it("omits freeText when empty string", () => {
    const result = appendAnswer([], "subject", [], "");
    expect(result[0].freeText).toBeUndefined();
  });

  it("skip produces empty selectedOptionIds", () => {
    const result = appendAnswer([], "subject", []);
    expect(result[0].selectedOptionIds).toEqual([]);
  });
});

describe("buildRenderInputs", () => {
  it("maps freeText items to freeTexts, not selections", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "subject", selectedOptionIds: [], freeText: "一台 MacBook" },
    ];
    const { selections, freeTexts } = buildRenderInputs(history, manifest);
    expect(freeTexts["subject"]).toBe("一台 MacBook");
    expect(selections["subject"]).toBeUndefined();
  });

  it("maps single-mode items to a string selection", () => {
    const singleDim = manifest.find((d) => d.mode === "single");
    expect(singleDim).toBeDefined();
    const optId = singleDim!.options[0].id;
    const history: AgentHistoryItem[] = [
      { questionId: singleDim!.questionId, selectedOptionIds: [optId] },
    ];
    const { selections } = buildRenderInputs(history, manifest);
    expect(typeof selections[singleDim!.questionId]).toBe("string");
    expect(selections[singleDim!.questionId]).toBe(optId);
  });

  it("maps multi-mode items to an array selection", () => {
    const multiDim = manifest.find((d) => d.mode === "multi");
    expect(multiDim).toBeDefined();
    const ids = multiDim!.options.slice(0, 2).map((o) => o.id);
    const history: AgentHistoryItem[] = [
      { questionId: multiDim!.questionId, selectedOptionIds: ids },
    ];
    const { selections } = buildRenderInputs(history, manifest);
    expect(Array.isArray(selections[multiDim!.questionId])).toBe(true);
    expect(selections[multiDim!.questionId]).toEqual(ids);
  });

  it("skips history items whose questionId is not in the manifest", () => {
    const history: AgentHistoryItem[] = [
      { questionId: "nonexistent_dim", selectedOptionIds: ["x"] },
    ];
    const { selections, freeTexts } = buildRenderInputs(history, manifest);
    expect(selections["nonexistent_dim"]).toBeUndefined();
    expect(freeTexts["nonexistent_dim"]).toBeUndefined();
  });
});
