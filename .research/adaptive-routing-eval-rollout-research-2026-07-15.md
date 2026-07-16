# Adaptive routing evaluation and rollout evidence research

Date checked: 2026-07-15 (Asia/Shanghai)
Scope: evidence needed before Thoth replaces fixed question order with adaptive DeepSeek routing
Status: research input for issue #5; no product threshold or rollout decision is made here
Source policy: official provider and observability documentation, NIST engineering-statistics guidance, Google SRE guidance, and the approved local Thoth assets only

## Bottom line

The defensible evidence stack has four gates, in this order:

1. deterministic recorded-response replay for every contract and fallback branch;
2. the already approved 21-fixture by 5-repetition live-model matrix;
3. a real-browser walkthrough spanning the distinct portrait, character, background, delivery, Completion, multi-turn, and budget-boundary paths;
4. a partial, time-limited production canary with a stable control, complete telemetry, and a tested rollback.

No layer substitutes for another. Contract replay proves that the application reacts correctly to known provider outputs. Live calls measure the chosen model and prompt on the curated suite. Browser use proves that the real UI and server route preserve the decision. A canary is the first layer that observes production traffic and dependency behavior.

Langfuse can index traces, scores, dataset items, and experiment runs, but the versioned repository artifact must remain the release record. Langfuse documents that local-dataset SDK experiments create traces but not dataset runs, so a dashboard alone is not a durable CI gate. [Langfuse Experiments via SDK](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)

Confidence intervals should be reported as uncertainty context, not used to weaken the approved hard gates. The 21 fixtures are a curated, heterogeneous conformance suite rather than a random sample from all possible user briefs, and five calls for one fixture are too few to establish a production SLO.

## 1. Local facts already decided

The open question is [issue #5, Define the Replay Evaluation and Rollout Gate](https://github.com/prompt-tools/thoth/issues/5).

The approved [adaptive question quality rubric](./adaptive-question-quality-rubric-2026-07-14.md) and its [machine-readable fixtures](./adaptive-question-quality.fixtures.json) already pin:

- 21 fixtures and 5 repetitions, for 105 attempted live runs;
- 19 Ask fixtures, for 95 Ask attempts;
- 2 Completion fixtures, for 10 Completion attempts;
- `deepseek-v4-flash`, thinking disabled, `temperature: 0`, `topP: 1`, 512 routing output tokens, and the pinned routing and judge prompts;
- four evidence layers for every attempt: raw provider evidence, normalized decision, rendered UI, and semantic judge result;
- every provider error, judge error, validation failure, and fallback remains in the denominator;
- zero tolerance for the named contract, catalog, Known-fact, UI, Completion, and budget violations;
- at least 95% `acceptableNext` hits among Ask attempts;
- at least 90% scored passes among all attempts.

Those percentages imply exact release counts for this suite:

| Metric | Denominator | Minimum passing count | Maximum failing count |
| --- | ---: | ---: | ---: |
| `acceptableNext` | 95 Ask attempts | 91 | 4 |
| scored pass | 105 attempts | 95 | 10 |
| expected Completion | 10 Completion attempts | 10 | 0 |
| every zero-tolerance invariant | its full applicable denominator | all | 0 |

The approved [DeepSeek turn contract](./deepseek-turn-contract-2026-07-15.md) additionally pins one provider call, no automatic retry, a 30-second end-to-end deadline, exact Ask/Completion validation, explicit `source`, and deterministic fallback. A fallback remains a failed live-model attempt even when the user can continue.

### Current local implementation gaps

These observations are from the repository, not external documentation:

- The current [.research eval runner](./scripts/eval-agent.mjs) exercises the legacy contract, retries some provider failures, and does not emit the approved raw/normalized/UI/judge observation shape.
- The current [eval Langfuse adapter](./scripts/eval-langfuse.mjs) records prompt/completion token totals and a few old routing fields, but not the new contract versions, DeepSeek cache hit/miss tokens, `finish_reason`, `system_fingerprint`, raw validation failures, or approved rubric outcomes.
- Production telemetry is opt-in and defaults off in [the controller](../src/components/prompt-guide/use-agent-guide-controller.ts). It flushes a session log at Completion or abandonment.
- The [telemetry route](../src/app/api/telemetry/route.ts) stores one session-level trace with the raw Subject brief, final prompt, and generic log entries. When Langfuse configuration is absent it is a no-op. It has no release cohort, model fingerprint, per-turn latency/usage, validation taxonomy, or telemetry-completeness signal.

Issue #5 therefore cannot be closed by running the existing evaluator unchanged. The release evidence must be generated by the new turn contract and must preserve the approved observation layers.

## 2. Documented external facts

### 2.1 DeepSeek evidence available to the harness

DeepSeek returns a completion ID, model, `system_fingerprint`, `finish_reason`, and usage fields. The documented finish reasons include `tool_calls`, `length`, `content_filter`, and `insufficient_system_resource`. A 200 response is therefore not, by itself, a valid routing result. [DeepSeek Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/)

Usage includes `prompt_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`, `completion_tokens`, total tokens, and reasoning tokens when present. These fields make cache behavior and request cost directly measurable per attempt. [DeepSeek Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/)

DeepSeek documents cache operation as best effort and says a hit is not guaranteed. Cache construction can take seconds and unused entries are later cleared. A release gate must report observed hit/miss tokens and calculate a cache-miss budget; it cannot assume that repeated fixtures will be cheap or fast. [DeepSeek Context Caching](https://api-docs.deepseek.com/guides/kv_cache/)

DeepSeek currently documents 400, 401, 402, 422, 429, 500, and 503 errors. It recommends correcting 400/422 inputs, fixing authentication or balance for 401/402, pacing 429 traffic, and retrying 500/503 after a wait. The approved Thoth baseline still uses zero automatic retries, but the error taxonomy should preserve these distinctions. [DeepSeek Error Codes](https://api-docs.deepseek.com/quick_start/error_codes/)

DeepSeek may keep a request connected and close it only if inference has not started after 10 minutes. That provider behavior does not protect Thoth's 30-second user deadline, so client/server elapsed time and local timeout reason must be measured independently. [DeepSeek Rate Limit and Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)

The current Flash prices are $0.0028 per million cache-hit input tokens, $0.14 per million cache-miss input tokens, and $0.28 per million output tokens. DeepSeek says prices can change, so the report must store the price table or pricing date used for each USD calculation rather than recompute historical runs from a future price. [DeepSeek Models and Pricing](https://api-docs.deepseek.com/quick_start/pricing/)

### 2.2 Langfuse evidence model

Langfuse experiments can run application code over a dataset, attach item-level and run-level evaluators, isolate individual failures, trace executions, and compare dataset runs. Hosted datasets produce dataset runs; local datasets produce traces and scores but currently no dataset run. [Langfuse Experiments via SDK](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)

Langfuse datasets can store inputs and expected outputs, can be built from production observations, and are versioned whenever items are added, updated, deleted, or archived. A dataset can be fetched and evaluated at a specific version timestamp. [Langfuse Datasets](https://langfuse.com/docs/evaluation/experiments/datasets)

Langfuse recommends deterministic code evaluators for parseability, schema, tool-call, and business-rule checks, and model-based judgment for semantic quality. That matches Thoth's approved separation between hard checks and the semantic judge. [Langfuse Code Evaluators](https://langfuse.com/docs/evaluation/evaluation-methods/code-evaluators)

Langfuse models observations as steps, traces as self-contained operations, and sessions as groups of related traces in a multi-turn workflow. It supports environment, tag, metadata, release, and version attributes for segmentation. [Langfuse Observability Data Model](https://langfuse.com/docs/observability/data-model)

For short-lived evaluation processes, Langfuse requires an explicit flush before exit to avoid losing buffered telemetry. [Langfuse Observability Data Model](https://langfuse.com/docs/observability/data-model)

### 2.3 Statistical and rollout evidence

NIST defines replication as running the same treatment more than once and notes that replication permits estimation of random error. NIST also says randomization is needed for defensible conclusions, while blocking isolates systematic nuisance effects. [NIST DOE Terminology](https://www.itl.nist.gov/div898/handbook/pri/section7/pri7.htm)

For binary proportions with small samples or few failures, NIST says the common symmetric normal approximation may be inaccurate and documents exact binomial confidence limits, including one-sided limits. [NIST Exact Binomial Confidence Limits](https://itl.nist.gov/div898/software/dataplot/refman2/auxillar/exacbici.htm)

The binomial model assumes repeated binary trials with a fixed success probability. Thoth's different fixtures deliberately represent different semantic difficulties, so a single pooled interval is descriptive rather than a claim that every future brief has one common pass probability. [NIST Binomial Distribution](https://itl.nist.gov/div898/handbook/eda/section3/eda366i.htm)

Google SRE recommends latency percentiles because averages hide tail behavior; the median describes the typical case while higher percentiles expose slower tails. [Google SRE Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)

Google SRE defines a canary as a partial, time-limited deployment evaluated against a control. It recommends one canary at a time, a population and duration large enough to be representative, metrics attributable to the change, and pause or rollback when the canary diverges from control. It does not prescribe one universal traffic percentage or duration. [Google SRE Canarying Releases](https://sre.google/workbook/canarying-releases/)

## 3. Evidence design justified by those facts

This section is an engineering inference from the documented facts and approved local requirements. It is not a product threshold decision.

| Gate | Question answered | Blocking artifact | What it cannot prove |
| --- | --- | --- | --- |
| Recorded replay | Does local code enforce the contract for known outputs and failures? | deterministic replay report and checked-in recordings | current provider quality or latency |
| 105 live attempts | Does the pinned model/prompt pass the curated rubric repeatedly? | immutable run bundle and aggregate report | production distribution or long-term provider reliability |
| Browser matrix | Does the deployed UI preserve the server decision and usable flow? | observed walkthrough ledger, screenshots, console/network evidence | population-level quality |
| Canary | Is the change safe and useful on real traffic relative to control? | cohort dashboard/export and rollback record | future behavior after models, prompts, catalog, or traffic change |

### 3.1 Deterministic fixture and recorded-response replay

Recorded replay should make no provider or judge calls. It feeds stored status/body pairs through the same production parser, validator, normalizer, fallback selector, and UI projection used by the browser.

Each recording should pin:

- fixture ID and repetition source;
- contract, fixture, prompt, catalog, and application version/hash;
- provider model and, when present, response ID and `system_fingerprint`;
- HTTP status, response headers needed for diagnosis, untouched response bytes or JSON, and elapsed time from the original call;
- expected raw status, validation result, normalized decision, fallback/source, rendered UI decision, and hard-failure codes.

Positive replay assertions:

- one valid Ask preserves the exact question ID, contextual question/helper text, ordered 3 to 6 option IDs, and Free-text availability;
- one legal zero-turn Completion renders Completion with no invented question or candidates;
- one legal later Completion respects Known facts, four-pillar coverage, eligibility, and budget;
- server normalization and browser projection show the same action, question ID, and candidate order;
- replay is byte-for-byte deterministic for its report artifact.

Minimum negative/error corpus:

| Class | Required recordings or mutations | Expected invariant |
| --- | --- | --- |
| HTTP | 400, 401, 402, 422, 429, 500, 503, network timeout | classified failure; no model pass; explicit deterministic fallback or recoverable error |
| 200 finish reason | `length`, `content_filter`, `insufficient_system_resource`, missing `finish_reason` | rejected before tool input is trusted |
| Tool envelope | missing call, wrong function, multiple calls, invalid JSON, non-object arguments, extra fields | atomic rejection; no salvaged fields |
| Ask shape | blank/overlong text, null Ask field, duplicate IDs, 2 IDs, 7 IDs | atomic rejection |
| Catalog | unknown question, out-of-dimension ID, out-of-allowlist ID, stale catalog ID | raw failure preserved; no filtered partial success |
| Semantics | repeated dimension, `mustNotAsk`, Known-fact conflict, delivery conflict, budget overrun | model decision rejected |
| Completion | premature Completion, Completion beyond budget, remaining blocking dependency | model Completion rejected |
| Boundary | request or response over 65,536 UTF-8 bytes | rejected at the matching trust boundary |
| Fallback | eligible pool present, empty pool with legal Completion, empty pool without legal Completion | deterministic Ask, `remainingEmpty`, or recoverable error respectively |

The replay report should include every case, expected result, actual result, and diff. The release gate is 100% agreement. A snapshot update is a reviewed contract change, not an automatic test refresh.

### 3.2 Live-model repeat design

Use the approved fixture file as the canonical input and preserve all 105 attempted runs. Do not rerun only failures and replace them; a rerun is a new named experiment.

Run structure justified by NIST replication and blocking guidance:

1. create five repetition blocks;
2. place every one of the 21 fixtures once in each block;
3. randomize fixture order inside each block;
4. record block, order, wall-clock time, response ID, model, and `system_fingerprint`;
5. if a challenger is evaluated, run baseline and challenger in the same block and randomize their within-fixture order;
6. keep concurrency fixed and low enough that the harness itself does not manufacture 429s.

This design spreads provider time-of-day or backend changes across the fixture set and makes those nuisance factors visible. It does not convert the curated fixtures into a random sample of future traffic.

#### Required per-attempt record

Use the rubric's raw/normalized/UI/judge shape, plus:

- experiment ID, block, randomized order, start/end timestamps, and elapsed milliseconds;
- commit/release, contract, catalog, fixture, routing-prompt, and judge-prompt hashes;
- HTTP status, DeepSeek response ID, returned model, `system_fingerprint`, and `finish_reason`;
- prompt, cache-hit, cache-miss, completion, total, and reasoning tokens;
- price-table date, calculated USD, and cache-hit ratio;
- request and response UTF-8 byte counts;
- provider, parse, schema, catalog, semantic, timeout, and fallback reason codes;
- judge status and raw response, even when the judge itself fails;
- browser-equivalent action, question text, candidate order, and Free-text availability.

#### Required aggregate report

For every rate, report numerator and denominator, not just a rounded percentage. Include:

- every approved hard invariant separately;
- `acceptableNext`, scored pass, and overall pass;
- provider-error, timeout, validation-error, fallback, and judge-error rates by reason;
- Completion confusion counts (`ask -> complete`, `complete -> ask`);
- results by fixture and a five-character pass/fail sequence per fixture;
- p50 and p95 end-to-end elapsed time across all attempts, plus separate successful-model and failure/timeout distributions;
- p50 and p95 prompt/cache/output tokens, USD per attempt, total USD, and observed cache-hit ratio;
- `system_fingerprint` and model distribution, so a provider backend change is visible.

Google SRE's percentile guidance supports p50/p95 reporting, but no official source supplies a Thoth-specific acceptable latency or cost. Those values remain product/operations decisions.

#### Confidence reporting without overstating the sample

Report a 95% exact binomial interval beside each binary point estimate and keep the approved exact-count gate authoritative.

For zero observed failures, the one-sided 95% exact upper bound is `1 - 0.05^(1/n)`:

| Observed result | One-sided 95% upper bound on failure probability |
| --- | ---: |
| 0 failures in 105 attempts | 2.81% |
| 0 failures in 95 Ask attempts | 3.10% |
| 0 failures in 10 Completion attempts | 25.89% |

These values follow the NIST exact-binomial method. They show why `10/10` Completion is a necessary conformance gate but weak population evidence. Preserve per-fixture results and continue monitoring Completion in the canary rather than claiming that zero observed failures means zero production risk.

### 3.3 Real-browser walkthrough matrix

The browser pass must use the real Next.js page, real `/api/llm` route, server-built DeepSeek request, and production-equivalent feature flag. Provider success cases must not use a mock. Deterministic failure injection is appropriate only for the fallback/error row because waiting for a live provider incident is not repeatable.

Candidate minimum matrix derived from the existing approved fixtures:

| Fixture/path | Distinct risk covered | Observable pass |
| --- | --- | --- |
| `business-portrait` | broad brief and upstream use-case dependency | contextual first question is in `acceptableNext`; gender/mood are not repeated |
| `xiaohongshu-cover` | known use case, title-space composition, background relevance | no use-case/composition repeat; candidates remain 3 to 6 and materially distinct |
| `game-card` | named character, prop, output form, scene differentiation | known sword/card facts are preserved; next question is character/world specific |
| `virtual-idol-avatar` | transparent delivery constraint | scene is suppressed; final prompt preserves transparent output intent |
| `explicit-scene` | exact background/lighting/pose facts | those dimensions are not asked again; another missing pillar advances |
| `couple-invitation` or `company-team` | multi-person subject | relationship/group identity survives questions and final deterministic prompt |
| `fully-specified-zero-turn` | legal zero-turn Completion | no question flashes; Completion and final prompt are usable |
| `business-portrait-after-use-case` | real multi-turn history | use case is not repeated; question changes based on the submitted answer |
| `sparse-budget-last-turn` | 10-turn boundary | exactly one legal Ask can occur; no invented Completion or turn 11 |
| `detailed-budget-last-turn` | 4-turn boundary | exactly one legal Ask can occur; no repeated scene/pose/style facts |
| injected provider/validation failure | fallback visibility and recovery | fallback is marked in telemetry, UI remains usable, manual retry works, no false model pass |

For every walkthrough, record:

- exact Subject brief and user selections;
- every rendered question/helper and ordered candidate ID;
- Free-text path visibility and one exercised Free-text submission;
- network status, total user-visible latency, and any console error;
- final prompt and the facts it preserved;
- Langfuse/session trace ID or explicit telemetry-disabled result;
- release cohort and stable session assignment;
- screenshot or short screen recording at the first Ask and final Completion.

All matrix rows must pass. This is a user-surface gate, not a statistical sample.

### 3.4 Telemetry required to diagnose a bad question

An actionable production record needs the same four layers as replay. A single final session blob is not enough for per-turn rates or latency.

Recommended mapping from Langfuse's documented data model:

- Langfuse session: one complete Subject-brief-to-Completion journey;
- trace: one Adaptive turn or one zero-turn Completion decision;
- generation observation: the DeepSeek call;
- validation/UI observations: local validation, fallback selection, and rendered projection;
- scores: hard-check booleans, sampled semantic score, and user feedback where available;
- release/environment/tags: control versus canary, contract version, prompt version, and catalog version.

Minimum fields:

| Area | Fields |
| --- | --- |
| Identity | internal session/turn/attempt IDs; cohort; environment; release |
| Configuration | contract, prompt, catalog, fixture/evaluator versions and hashes |
| Context | privacy-approved Subject brief representation, history, Known facts, coverage, budget, Eligible question IDs, candidate allowlists |
| Provider | response ID, HTTP status, model, `system_fingerprint`, `finish_reason`, elapsed time, request/response bytes |
| Usage | prompt/cache-hit/cache-miss/completion/reasoning tokens, price-table date, USD |
| Raw | untouched tool input or provider failure, parse/schema outcome |
| Normalized | source, action, question ID, wording, option IDs, validation and fallback reasons |
| UI | rendered action/question/candidate IDs, Free-text availability, client elapsed time |
| User outcome | selection/free text, retry, skip, manual early finish, abandonment, Completion, final-prompt generation |
| Evaluation | hard failures, semantic criteria/reasons when sampled, pass/fail |
| Telemetry health | ingestion attempted/succeeded, export/flush status, missing-field count |

Do not log API keys, authorization headers, or a DeepSeek `user_id` derived from private user content. DeepSeek explicitly says `user_id` must not contain private information. [DeepSeek Rate Limit and Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)

The checked-in JSON/Markdown report remains canonical. Langfuse is the query and diagnosis surface. If its ingestion fails, the run or canary window must report telemetry incompleteness rather than silently treating missing bad turns as success.

### 3.5 Go/no-go and canary structure

The following gate order follows from the evidence layers. Values already approved locally are shown as fixed. Values requiring product/operations judgment are marked undecided.

| Stage | Go condition | No-go / rollback condition |
| --- | --- | --- |
| Contract replay | 100% expected/actual agreement; all negative branches present | any mismatch or unreviewed snapshot change |
| Live 105 | all zero-tolerance invariants pass; at least 91/95 `acceptableNext`; at least 95/105 scored pass; 10/10 Completion | any fixed gate miss |
| Operational live evidence | complete status/latency/usage/cache/cost report | missing attempts or telemetry; numeric budgets undecided |
| Browser matrix | every row observed through the real surface | any UI/server mismatch, unusable fallback, console/runtime error, or missing evidence |
| Canary | partial/time-limited cohort; stable control; representative minimum volume; metrics attributable to route | any confirmed hard invariant; operational/quality divergence beyond undecided budgets; telemetry incomplete |
| Full enablement | canary passes and rollback has been exercised | rollback path untested or control unavailable |

Canary implementation inferences:

- assign control/canary once per wizard session so one journey never switches routers midstream;
- keep the current fixed-order route available as the rollback control until the canary is complete;
- run one adaptive-route canary at a time;
- gate on both elapsed duration and completed-session count, not clock time alone;
- compare canary to control for provider/validation/fallback rate, p50/p95 latency, cost, abandonment, manual retry/finish, repeated questions, and sampled semantic quality;
- trigger immediate rollback on a confirmed machine-verifiable zero-tolerance invariant;
- pause or rollback on operational and semantic budgets selected before exposure starts;
- preserve the exact release, contract, prompt, catalog, and model fingerprints for every window.

Google's canary guidance supports partial exposure, a control, representative volume, attributable metrics, and rollback, but it does not justify specific percentages, durations, or Thoth quality budgets. Those numbers must come from traffic volume, UX expectations, API spend, and risk appetite.

## 4. Evidence patterns that are not sufficient

- Passing typecheck, unit tests, and build without a recorded-response replay.
- Running 105 calls but dropping provider, fallback, or judge failures from denominators.
- Replacing failed attempts with reruns under the same experiment ID.
- Reporting average latency without p50/p95 and failure/timeout distributions.
- Reporting token totals without cache hit/miss and pricing date.
- Assuming repeated prompts receive cache hits.
- Treating a deterministic fallback as a live-model success.
- Treating a Langfuse dashboard as the only release artifact.
- Using fixture `acceptableNext` as an online metric for arbitrary production briefs without an independently defined production evaluator.
- Enabling 100% traffic immediately after the offline suite.
- Claiming a population failure rate of zero from 0 observed failures.

## 5. Smallest unresolved user decisions

The approved assets already settle fixture scope, repetitions, semantic gates, the model contract, and the deterministic failure behavior. Three product/operations decisions remain:

1. **Operational budget:** maximum acceptable provider/validation/fallback rate, p95 user-visible latency, and USD per completed session, including whether each is an absolute ceiling, a control-relative ceiling, or both.
2. **Canary envelope:** exposure steps, minimum completed sessions per step, minimum duration, and the non-hard-failure pause/rollback rule. These require expected production traffic and risk tolerance; official canary guidance does not supply universal numbers.
3. **Telemetry privacy:** whether raw Subject briefs/history/final prompts may be stored for semantic diagnosis, and the consent, redaction, sampling, access, and retention rules. The current opt-in route stores those raw fields, while a release gate needs measurable telemetry coverage.

Once those three values are supplied, issue #5 can turn this evidence design into an executable release specification without reopening the approved rubric or DeepSeek turn contract.

## Primary sources

### DeepSeek

- [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/)
- [Error Codes](https://api-docs.deepseek.com/quick_start/error_codes/)
- [Context Caching](https://api-docs.deepseek.com/guides/kv_cache/)
- [Rate Limit and Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)
- [Models and Pricing](https://api-docs.deepseek.com/quick_start/pricing/)

### Langfuse

- [Experiments via SDK](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)
- [Datasets](https://langfuse.com/docs/evaluation/experiments/datasets)
- [Code Evaluators](https://langfuse.com/docs/evaluation/evaluation-methods/code-evaluators)
- [Observability Data Model](https://langfuse.com/docs/observability/data-model)

### Statistical and rollout engineering

- [NIST DOE Terminology](https://www.itl.nist.gov/div898/handbook/pri/section7/pri7.htm)
- [NIST Exact Binomial Confidence Limits](https://itl.nist.gov/div898/software/dataplot/refman2/auxillar/exacbici.htm)
- [NIST Binomial Distribution](https://itl.nist.gov/div898/handbook/eda/section3/eda366i.htm)
- [Google SRE Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Canarying Releases](https://sre.google/workbook/canarying-releases/)
