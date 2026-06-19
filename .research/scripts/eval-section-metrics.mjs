/** Shared eval ↔ corpus section metrics (questionnaire / autofill / final prompt). */

export const SECTIONS = [
  "subject",
  "identity",
  "face",
  "hair",
  "outfit",
  "pose",
  "interaction",
  "scene",
  "camera",
  "lighting",
  "style",
  "quality",
  "negative",
];

export const DIM_TO_SECTION = {
  subject: "subject",
  person_type: "subject",
  gender_presentation: "identity",
  age_band: "identity",
  skin_tone: "identity",
  body_type: "pose",
  face_features: "face",
  hair: "hair",
  makeup: "hair",
  outfit: "outfit",
  pose: "pose",
  character_interaction: "interaction",
  character_props: "interaction",
  scene: "scene",
  framing: "camera",
  camera: "camera",
  camera_angle: "camera",
  aspect_ratio: "camera",
  composition: "quality",
  lighting: "lighting",
  art_style: "style",
  color_palette: "style",
  mood: "style",
  character_render_style: "style",
  character_archetype: "style",
  detail_level: "quality",
  post_processing: "quality",
  use_case: "quality",
  constraints: "negative",
  portrait_expression: "face",
};

export function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

/** Questionnaire-only dimension ids from eval turns (excludes autofill). */
export function questionnaireDimIds(run) {
  const ids = [];
  for (const turn of run.turns ?? []) {
    if (!turn.nextQuestionId || turn.error) continue;
    if (turn.answer?.kind === "done") continue;
    ids.push(turn.nextQuestionId);
  }
  return ids;
}

export function autofillDimIds(run) {
  return (run.autoFilledDimensions ?? []).map((x) => x.questionId);
}

export function dimsToSections(dimIds) {
  const sections = new Set();
  for (const d of dimIds) {
    const sec = DIM_TO_SECTION[d];
    if (sec) sections.add(sec);
  }
  return sections;
}

/**
 * @param {object[]} runs - parsed runs.jsonl rows (non-error)
 * @param {(text: string) => Set<string>} detectPortraitSections
 */
export function aggregateEvalSectionMetrics(runs, detectPortraitSections) {
  const questionnaireSectionCounts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  const autofillSectionCounts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  const pathSectionCounts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  const promptSectionCounts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
  const dimQuestionnaireCounts = {};
  const dimAutofillCounts = {};
  let promptN = 0;
  let earlyStopCount = 0;

  for (const run of runs) {
    if (run.terminationReason === "error") continue;

    const qDims = questionnaireDimIds(run);
    const aDims = autofillDimIds(run);
    if (qDims.length <= 2 && run.terminationReason === "remainingEmpty") {
      earlyStopCount += 1;
    }

    for (const d of qDims) {
      dimQuestionnaireCounts[d] = (dimQuestionnaireCounts[d] ?? 0) + 1;
    }
    for (const d of aDims) {
      dimAutofillCounts[d] = (dimAutofillCounts[d] ?? 0) + 1;
    }

    for (const s of dimsToSections(qDims)) questionnaireSectionCounts[s] += 1;
    for (const s of dimsToSections(aDims)) autofillSectionCounts[s] += 1;
    for (const s of dimsToSections([...qDims, ...aDims])) pathSectionCounts[s] += 1;

    const prompt = run.finalPrompt?.zh ?? run.finalPrompt?.en ?? "";
    if (prompt) {
      promptN += 1;
      for (const s of detectPortraitSections(prompt)) promptSectionCounts[s] += 1;
    }
  }

  const evalN = runs.filter((r) => r.terminationReason !== "error").length;
  const toRates = (counts) =>
    Object.fromEntries(SECTIONS.map((s) => [s, pct(counts[s], evalN)]));
  const promptRates = Object.fromEntries(SECTIONS.map((s) => [s, pct(promptSectionCounts[s], promptN)]));

  const dimRanking = (counts) =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([dim, count]) => ({
        dim,
        count,
        rate: pct(count, evalN),
        section: DIM_TO_SECTION[dim] ?? "?",
      }));

  return {
    evalN,
    promptN,
    earlyStopCount,
    sectionRatesQuestionnaire: toRates(questionnaireSectionCounts),
    sectionRatesAutofill: toRates(autofillSectionCounts),
    sectionRatesPath: toRates(pathSectionCounts),
    sectionRatesFinalPrompt: promptRates,
    dimQuestionnaireRates: dimRanking(dimQuestionnaireCounts),
    dimAutofillRates: dimRanking(dimAutofillCounts),
  };
}
