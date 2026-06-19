import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  questionnaireDimIds,
  autofillDimIds,
  dimsToSections,
  aggregateEvalSectionMetrics,
  pct,
} from "./eval-section-metrics.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const simpleEvalPath =
  ".research/out/eval/2026-06-18T16-37-15__deepseek-deepseek-chat__portrait-simple-v2/runs.jsonl";

describe("eval-section-metrics", () => {
  it("pct rounds to one decimal", () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(0, 0)).toBe(0);
  });

  it("questionnaireDimIds excludes done turns and autofill", () => {
    const run = {
      turns: [
        { nextQuestionId: "subject", answer: { kind: "pick" } },
        { nextQuestionId: "framing", answer: { kind: "pick" } },
        { nextQuestionId: "person_type", answer: { kind: "done" } },
      ],
      autoFilledDimensions: [{ questionId: "scene" }],
      terminationReason: "remainingEmpty",
    };
    expect(questionnaireDimIds(run)).toEqual(["subject", "framing"]);
    expect(autofillDimIds(run)).toEqual(["scene"]);
  });

  it("dimsToSections dedupes multiple dims in same section", () => {
    expect([...dimsToSections(["face_features", "portrait_expression"])]).toEqual(["face"]);
    const runs = [
      {
        turns: [
          { nextQuestionId: "face_features", answer: { kind: "pick" } },
          { nextQuestionId: "portrait_expression", answer: { kind: "pick" } },
        ],
        autoFilledDimensions: [],
        terminationReason: "remainingEmpty",
        finalPrompt: { zh: "face" },
      },
    ];
    const detect = () => new Set(["face"]);
    const m = aggregateEvalSectionMetrics(runs, detect);
    expect(m.sectionRatesQuestionnaire.face).toBe(100);
  });

  it("simple-v2 snapshot: face questionnaire 83.3%, style autofill 53%, pose autofill 0%", () => {
    const runsPath = path.join(root, simpleEvalPath);
    if (!fs.existsSync(runsPath)) {
      return; // skip when eval artifact absent
    }
    const runs = fs.readFileSync(runsPath, "utf8").split("\n").filter(Boolean).map(JSON.parse);
    const detect = (text) => {
      const s = new Set();
      if (/hair|pose|scene|lighting|face|subject|negative|interaction|style|quality|camera|outfit|identity/i.test(text)) {
        if (/hair/i.test(text)) s.add("hair");
        if (/pose|standing/i.test(text)) s.add("pose");
        if (/scene|background/i.test(text)) s.add("scene");
      }
      return s;
    };
    const m = aggregateEvalSectionMetrics(runs, detect);
    expect(m.evalN).toBe(60);
    expect(m.sectionRatesQuestionnaire.face).toBe(83.3);
    expect(m.sectionRatesQuestionnaire.style).toBe(0);
    expect(m.sectionRatesAutofill.style).toBe(53.3);
    expect(m.sectionRatesAutofill.pose).toBe(0);
    expect(m.sectionRatesAutofill.interaction).toBe(8.3);
    expect(m.earlyStopCount).toBe(10);
  });
});
