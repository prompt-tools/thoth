# Adaptive Portrait Question Quality Rubric

Date: 2026-07-14
Status: Approved by user on 2026-07-15
Scope: choosing the next portrait/character question and its catalog-backed candidates

## Product objective

The wizard must produce meaningfully differentiated images, not complete a generic portrait checklist. Every Adaptive turn must establish an upstream constraint or materially improve one of four pillars:

1. **Character signature** — identity, face, hair, outfit, body, makeup, props.
2. **Narrative behavior** — expression, pose, interaction, action.
3. **Visual world** — background, framing, camera, composition, lighting.
4. **Presentation purpose** — use case, output form, art style, color, mood.

A pillar is covered only by a fact specific enough to move the result away from a generic portrait. “A person”, a neutral stance, a plain backdrop, or a generic avatar use remains a Known fact, but does not automatically provide material coverage.

## Dimension ownership

Each dimension belongs to one pillar. This mapping is the coverage oracle:

| Pillar | Dimensions |
| --- | --- |
| Character signature | `subject`, `person_type`, `gender_presentation`, `age_band`, `skin_tone`, `face_features`, `body_type`, `character_archetype`, `hair`, `outfit`, `makeup`, `character_props` |
| Narrative behavior | `portrait_expression`, `pose`, `character_interaction` |
| Visual world | `scene`, `framing`, `camera_angle`, `camera`, `composition`, `lighting`, `aspect_ratio` |
| Presentation purpose | `use_case`, `output_format`, `character_render_style`, `art_style`, `color_palette`, `mood`, `detail_level` |

`output_format` is a semantic fact, not currently an askable catalog dimension. For example, “transparent PNG” suppresses an environment background through a delivery constraint; it does not pretend that transparency is a material Visual-world fact.

## Known-fact suppression

The required Subject brief is collected before Adaptive turns. After that, `subject` is never asked again.

- An exact Known fact suppresses the whole answered dimension.
- A broad Known fact suppresses conflicting candidates, but may permit a narrower follow-up in the same dimension.
- A broad follow-up is mechanically valid only when the fixture supplies a `candidatePolicy`; every shown ID must be allowed and no shown ID may be forbidden.
- Genre, role, mood, or style may rank candidates, but association is not a Known fact. “Cyberpunk swordswoman” may rank neon settings; it does not establish a neon-city background.
- A selected option or Free-text answer suppresses that history dimension on later turns.

Always suppress dimensions that repeat Known facts, conflict with them, are incompatible with delivery constraints, are irrelevant under the chosen output/framing, or would not materially change the prompt. `mustNotAskReasons` records which rule applies.

## Next-question priority

Use dependency-first priority, not a fixed order:

1. Ask an unanswered upstream constraint only when the fixture or policy can name which downstream dimensions or candidates it changes: use case, output form, subject relationship, or photo/illustration mode.
2. Otherwise choose the Eligible dimension with the largest expected differentiation gain.
3. Prefer a missing pillar over a second low-value detail in a covered pillar.
4. Within one pillar, prefer the question that removes the most ambiguity from later turns.

“职业女性肖像” may ask `use_case` first because resume, editorial, brand, and social outputs change framing, scene, and style candidates. “银发剑士手游卡面” already states output and prop, so hair style, outfit, pose, or scene has more value.

## Question budgets

The budget is a ceiling, not a quota:

| Material pillars in the Subject brief | Class | Maximum Adaptive turns |
| --- | --- | ---: |
| 0–1 | Sparse | 10 |
| 2–3 | Partial | 7 |
| 4, with material gaps | Detailed | 4 |

The class is derived from distinct pillars among `source: "brief"` facts whose `materiallyDifferentiating` value is true. History expands current coverage but never changes the session ceiling. The Subject brief is not an Adaptive turn.

For one replay assertion:

```text
proposedTurns = history.length + (expectedAction == "ask" ? 1 : 0)
```

`proposedTurns` must not exceed the class limit. Do not reuse the current eval runner's generic turn counter: errors, fallback, and Completion have different semantics.

## Completion

Completion is valid only when:

- every pillar has at least one materially differentiating fact from the brief or history;
- no remaining Eligible dimension is likely to materially change the intended image;
- the current turn count is within budget.

A fully specified Subject brief may complete with zero Adaptive turns. Reaching the budget without valid Completion is a quality failure, not permission to invent facts or declare success.

## Hard failures

Any hard failure fails the run before scoring:

- the model asks `subject` after the Subject brief;
- `nextQuestionId` is outside the eligible portrait manifest;
- the question repeats, conflicts with, or guesses a Known fact;
- the chosen dimension is in `mustNotAsk`;
- a raw option ID is outside the selected dimension's catalog or violates a broad fact's candidate policy;
- the routing response cannot be parsed or fails the pinned structured-output contract;
- for an Ask action, fewer than 3 or more than 6 unique catalog candidates reach the UI;
- for an Ask action, the surfaced question or candidate set belongs to a different dimension than `nextQuestionId`;
- for an Ask action, the user-owned Free-text path is unavailable;
- the model returns Completion for an `expectedAction: "ask"` fixture;
- the model returns Ask for an `expectedAction: "complete"` fixture;
- Completion occurs without material coverage in every pillar;
- the 10/7/4 budget is exceeded;
- provider failure or model fallback prevents a live-model decision.

Filtering invalid raw IDs does not erase the raw-output failure. A fallback UI may be usable, but it is not a live-model pass.

## Scoring

The five semantic criteria apply only to Ask actions without hard failures. Legal Completion has no question or candidates and never receives invented semantic scores.

| Criterion | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Dependency value | Ignores a blocking upstream constraint | Useful but downstream, or asks a weak upstream constraint | Resolves/respects the real dependency; if none exists, does not invent one |
| Differentiation gain | Cosmetic or generic | Adds a useful detail | Substantially changes character, story, world, or purpose |
| Coverage progress | Repeats a covered pillar without need | Strengthens a weak covered pillar | Fills the weakest or missing pillar |
| Contextual wording | Generic catalog label | Mentions some context | Connects the question to brief and history |
| Candidate quality | Generic, repetitive, or off-question | Mostly relevant | All 3–6 are coherent and meaningfully distinct |

Differentiation gain measures the magnitude of the image change. Coverage progress measures whether that change is spent on the weakest pillar.

An Ask run has `scoredPass: true` only with no hard failure, a successful judge response, at least 8/10 total, and 2/2 for Differentiation gain.

A Completion run skips the judge and has `scoredPass: true` only when the fixture expects Completion, the live routing model returns Completion, all Completion conditions hold, and there is no hard failure. The 8/10 and Differentiation-gain gates do not apply to Completion. Provider errors, fallback, hard failures, and Ask judge errors always set `scoredPass: false`.

`overallPass` additionally requires an Ask run's `nextQuestionId` to be in `acceptableNext`; for Completion it equals `scoredPass`.

- Passing 8/10 example: `2 + 2 + 2 + 1 + 1`; the question fills a missing pillar and materially changes the image even if wording and candidates are merely good.
- Failing 7/10 example: `2 + 1 + 2 + 1 + 1`; it targets the right pillar but the answer would not differentiate enough, so it also fails the mandatory gain gate.

The pinned routing prompt is [adaptive-question-system-v1.md](./adaptive-question-system-v1.md). The pinned semantic judge is [adaptive-question-judge-v1.md](./adaptive-question-judge-v1.md). Neither model sees `acceptableNext`, `mustNotAsk`, expected scores, or pass labels. The runner computes totals and pass/fail.

## Machine-readable suite

The source of truth is [adaptive-question-quality.fixtures.json](./adaptive-question-quality.fixtures.json), validated by [adaptive-question-quality.schema.json](./adaptive-question-quality.schema.json).

Prompt versions resolve to same-stem files in this directory: `adaptive-question-system-v1` loads `adaptive-question-system-v1.md`, and `adaptive-question-judge-v1` loads `adaptive-question-judge-v1.md`. A missing or mismatched prompt file is a run-configuration failure.

```ts
type DifferentiationPillar =
  | "characterSignature"
  | "narrativeBehavior"
  | "visualWorld"
  | "presentationPurpose";

interface KnownFact {
  dimension: string;
  value: string;
  source: "brief" | "history";
  specificity: "exact" | "broad";
  pillar: DifferentiationPillar;
  materiallyDifferentiating: boolean;
  knownOptionIds?: string[];
  candidatePolicy?: {
    allowedCandidateIds: string[];
    forbiddenCandidateIds: string[];
  };
}

interface AdaptiveQuestionFixture {
  id: string;
  brief: string;
  history: Array<{
    questionId: string;
    selectedOptionIds: string[];
    freeText?: string;
  }>;
  mode: "adaptive";
  budgetClass: "sparse" | "partial" | "detailed";
  expectedAction: "ask" | "complete";
  acceptableNext: string[];
  mustNotAsk: string[];
  mustNotAskReasons: Record<
    string,
    "known_fact" | "conflict" | "irrelevant" | "delivery_constraint" | "budget"
  >;
  expectedKnownFacts: KnownFact[];
  dependencyReason?: string;
}
```

For `expectedAction: "ask"`, any of 2–4 `acceptableNext` dimensions passes; ordering is not graded. For Completion, `acceptableNext` is empty. Every `known_fact` reason must have a matching fact; every history-sourced fact must match a non-empty selection or Free-text answer for that dimension.

The suite includes the required business portrait, Xiaohongshu cover, otome POV, game card, job headshot, and virtual-idol scenarios, plus background, character-sheet, group, negative, zero-turn Completion, and multi-turn cases. Boundary fixtures exercise Sparse 9/10, Partial 7/7 Completion, and Detailed 3/4. The JSON remains canonical; this document does not duplicate its full table.

## Observation contract

Each attempted run must preserve four layers rather than overwrite raw evidence:

```ts
interface ReplayObservation {
  fixtureId: string;
  repetition: 1 | 2 | 3 | 4 | 5;
  config: {
    routing: {
      provider: string;
      model: string;
      systemPromptVersion: string;
      sampling: { temperature: number; topP: number };
      maxOutputTokens: number;
      thinking: "disabled";
    };
    judge: {
      provider: string;
      model: string;
      promptVersion: string;
      sampling: { temperature: number; topP: number };
      maxOutputTokens: number;
      thinking: "disabled";
    };
    turnBudgets: { sparse: 10; partial: 7; detailed: 4 };
  };
  raw: {
    status: "ok" | "provider_error" | "parse_error" | "schema_error";
    providerResponse: unknown | null;
    toolInput: unknown | null;
    nextQuestionId: string | null;
    done: boolean | null;
    optionIds: string[];
    helperText: string | null;
    error: string | null;
  };
  normalized: {
    source: "model" | "fallback" | "remainingEmpty";
    action: "ask" | "complete";
    nextQuestionId: string | null;
    done: boolean;
    optionIds: string[];
    droppedInvalidOptionIds: string[];
    proposedTurns: number;
    turnBudget: 10 | 7 | 4;
  };
  ui: {
    renderedAction: "ask" | "complete";
    questionText: string | null;
    shownOptionIds: string[];
    freeTextAvailable: boolean | null;
  };
  judge: {
    status: "ok" | "error" | "skipped";
    rawResponse: unknown | null;
    criteria: Record<
      | "dependencyValue"
      | "differentiationGain"
      | "coverageProgress"
      | "contextualWording"
      | "candidateQuality",
      { score: 0 | 1 | 2; reason: string }
    > | null;
    error: string | null;
  };
  outcome: {
    expectedAction: "ask" | "complete";
    acceptableNextHit: boolean | null;
    hardFailures: string[];
    semanticTotal: number | null;
    scoredPass: boolean;
    overallPass: boolean;
  };
}
```

Raw provider payloads, parse errors, schema failures, and raw catalog failures belong to `raw`; eligibility, suppression, coverage, Completion, and budget belong to `normalized`; rendered candidate count and Free text belong to `ui`; wording, coherence, and differentiation belong to `judge`. For Completion, `renderedAction` is `"complete"`, `questionText` is `null`, `shownOptionIds` is empty, and `freeTextAvailable` is `null` rather than a failed Ask check. The judge preserves its raw response, every per-criterion reason, and any error.

The future adaptive tool contract must return the full structured output pinned in `adaptive-question-system-v1`, including a proposed `nextQuestionId`, contextual question text, candidates, and Completion decision. The current runtime's locally synthesized `rawNextQuestionId`/`rawDone` are not model evidence.

## Repeatable run matrix

- run every fixture five times;
- use the provider, model, prompt versions, sampling values, and budgets pinned in the suite's `runConfig`;
- grade every attempted run, including provider errors, judge errors, and fallback paths;
- invoke the semantic judge only for an Ask action that reaches scoring; record `skipped` for Completion or a pre-judge hard failure;
- keep raw, normalized, UI, and judge values in the observation contract;
- report numerator and denominator for every aggregate metric.

Provider errors, fallback, hard failures, and Ask judge errors enter the all-attempt scored-pass denominator as failures. Valid Completion enters that same denominator as a pass under the Completion rule above. `acceptableNext` hit rate, UI 3–6 compliance, and Free-text availability use all `expectedAction: "ask"` runs; an unexpected Completion fails those Ask-only checks rather than escaping their denominator. Completion accuracy uses only `expectedAction: "complete"` runs, and Ask-only UI fields are `null` for a legal Completion.

## Aggregate replay targets

- `mustNotAsk` violation rate: 0%;
- Known-fact repeat rate: 0%;
- raw catalog ID validity: 100%;
- UI 3–6 candidate compliance: 100%;
- Free-text availability: 100%;
- premature Completion rate: 0%;
- expected Completion miss rate: 0%;
- budget-overrun rate: 0%;
- `acceptableNext` hit rate: at least 95% of Ask runs;
- scored pass rate: at least 90% of all attempted runs.

## Verified implementation gaps

The current runtime is an expected failing baseline:

- `ordered[0]` fixes the next dimension before the model call;
- the current production system prompt explicitly forbids the model from choosing a dimension or Completion and therefore is not `adaptive-question-system-v1`;
- the provider tool returns candidates/helper text, not a model-selected dimension or Completion;
- Subject-brief facts do not semantically suppress answered dimensions;
- `use_case` is omitted from the interactive wizard even when upstream;
- parsing accepts any non-empty number of valid candidates and may expand fallback to the whole option set;
- Completion follows fixed active-set exhaustion, not Differentiation coverage.

These are requirements for the later DeepSeek contract and replay implementation tickets, not production changes authorized by this rubric.
