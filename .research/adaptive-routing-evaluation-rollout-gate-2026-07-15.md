# Adaptive routing evaluation and rollout gate

Date approved: 2026-07-15 (Asia/Shanghai)
Decision owner: product owner, through the issue-5 grilling session
Status: approved, implementation-ready release specification; no production code is changed by this document

## Decision

Adaptive DeepSeek routing may replace fixed question ordering only through this sequence:

1. deterministic recorded-response replay;
2. the pinned 21-fixture × 5-repetition live-model gate;
3. a real-browser walkthrough matrix;
4. a session-sticky 10% then 50% production canary with the fixed route as control;
5. full enablement only after the canary and rollback drill pass.

No stage substitutes for another. Typecheck, unit tests, build success, the legacy seed evaluator, a Langfuse dashboard, or a usable fallback alone is not release evidence.

This decision applies the vocabulary in [CONTEXT.md](../CONTEXT.md), the [background taxonomy](./portrait-background-taxonomy-2026-07-14.md), and the evidence research in [adaptive-routing-eval-rollout-research-2026-07-15.md](./adaptive-routing-eval-rollout-research-2026-07-15.md). It does not reopen the approved [quality rubric](./adaptive-question-quality-rubric-2026-07-14.md), [fixtures](./adaptive-question-quality.fixtures.json), [routing prompt](./adaptive-question-system-v1.md), [judge prompt](./adaptive-question-judge-v1.md), or [DeepSeek turn contract](./deepseek-turn-contract-2026-07-15.md).

## Locked baseline

- Routing model: `deepseek-v4-flash`.
- Thinking: disabled.
- Streaming: disabled.
- Routing output ceiling: 512 tokens.
- Calls per Adaptive turn: one.
- Automatic retries: zero.
- End-to-end turn deadline: 30 seconds.
- Request and response ceiling: 65,536 UTF-8 bytes each.
- Fixture attempts: 21 fixtures × 5 repetitions = 105.
- Ask attempts: 19 × 5 = 95.
- Completion attempts: 2 × 5 = 10.
- Judge calls: at most 95, only after a mechanically valid Ask.
- Maximum routing-plus-judge calls: 200.

The old `.research/scripts/eval-agent.mjs` remains a full-session seed/fuzz harness. It is useful for exploratory runs but is not an Adaptive routing gate and must not be reported as one.

## Failure classes

The release report must keep these classes separate.

### Zero-tolerance product and contract violations

These must remain at zero in live evaluation, browser walkthroughs, and canary evidence:

- asking `subject` after a Subject brief;
- asking a repeated, conflicting, ineligible, or `mustNotAsk` dimension;
- returning a raw catalog ID outside the exact candidate allowlist;
- allowing invalid raw IDs to pass after filtering;
- showing anything other than 3–6 unique, matching catalog candidates for Ask;
- removing the Free-text answer path;
- Ask/Completion confusion;
- Completion without all four materially differentiating pillars;
- exceeding the derived 10/7/4 budget;
- letting the browser render a different action, question, or candidate order than the server accepted.

Recorded replay deliberately injects these violations. Its gate is 100% expected detection and rejection, with zero injected violations accepted as a model decision or rendered to the UI.

One undetected replay violation or one confirmed live/browser/canary instance blocks release or immediately rolls back a canary.

### Operational-failure attempt

An attempt is counted once in this union when it has any provider/network error, local timeout, unacceptable `finish_reason`, tool-envelope/parse/schema failure, judge error, or `source` other than `model`. Multiple reasons on one attempt do not inflate the numerator.

The operational allowance never converts a zero-tolerance violation into a pass. It only allows up to two correctly rejected and visibly marked failure/fallback attempts in the 105-attempt live batch.

## Gate 1: deterministic recorded-response replay

### Execution rule

Replay makes zero routing-provider and zero judge-provider calls. Stored status/body pairs must pass through the same production parser, validator, normalizer, fallback selector, and browser projection used by the live route. The evaluator must not contain a second implementation of those rules.

Each recording pins:

- fixture and source repetition;
- application commit plus contract, fixture, prompt, judge, and catalog hashes;
- provider model, HTTP status, response ID, `system_fingerprint`, `finish_reason`, and original elapsed time when available;
- untouched response body or bytes and untouched tool arguments;
- expected raw status, normalized action, source/fallback reason, UI projection, and hard-failure codes.

### Minimum corpus

| Class | Required cases |
| --- | --- |
| Valid | Ask, zero-turn Completion, later Completion |
| HTTP/network | 400, 401, 402, 422, 429, 500, 503, timeout |
| Finish reason | `length`, `content_filter`, `insufficient_system_resource`, missing value |
| Tool envelope | missing call, wrong function, multiple calls, invalid JSON, non-object arguments, extra field |
| Ask shape | blank/overlong text, wrong nullability, duplicate IDs, 2 IDs, 7 IDs |
| Catalog | unknown question, wrong-dimension ID, out-of-allowlist ID, stale ID |
| Semantics | repeat, `mustNotAsk`, Known-fact conflict, delivery conflict, budget overrun |
| Completion | premature Completion, over-budget Completion, remaining blocking dependency |
| Boundary | request and response over 65,536 UTF-8 bytes |
| Fallback | safe Eligible Ask, legal `remainingEmpty`, and no-safe-answer recoverable error |

### Passing condition

- 100% expected/actual agreement;
- 100% detection and rejection of injected zero-tolerance violations, with zero undetected;
- byte-for-byte deterministic report output for the same input;
- no missing branch from the table above;
- any snapshot change is reviewed as a contract change, never auto-accepted.

Any mismatch exits nonzero and stops the release sequence.

## Gate 2: 105-attempt live-model batch

### Run design

1. Create five repetition blocks.
2. Put every fixture once in each block.
3. Randomize fixture order within each block.
4. Keep concurrency fixed and low enough not to manufacture 429 responses.
5. Preserve every attempted run. A failed attempt is not replaced; a rerun receives a new experiment ID.
6. Judge only a mechanically valid Ask. Record `skipped` for Completion and pre-judge failure.

For every attempt, retain the approved raw, normalized, UI, judge, and outcome layers plus experiment/block/order, timestamps, hashes, HTTP and DeepSeek metadata, UTF-8 byte counts, cache hit/miss and output tokens, price-table date, USD, latency, and machine-readable failure codes.

### Exact live gates

| Metric | Go condition |
| --- | ---: |
| `mustNotAsk`, Known-fact repeat/conflict, raw catalog, UI, Free-text, Completion, and budget violations | 0 |
| `acceptableNext` | at least 91/95 Ask attempts |
| scored pass | at least 95/105 attempts |
| expected Completion | 10/10 |
| Operational-failure attempts | at most 2/105 |
| End-to-end latency | p95 at most 10 seconds |

Latency uses all 105 attempts, including failures and timeouts. The report also shows p50/p95 separately for successful model decisions and failed attempts.

The report must include numerator and denominator for every rate, per-fixture five-character pass/fail sequences, Completion confusion counts, provider/fallback/judge failure taxonomy, p50/p95 token and USD distributions, total USD, cache-hit ratio, model and `system_fingerprint` distribution, and exact-binomial confidence intervals as context. Confidence intervals do not weaken the exact gates.

The 105 attempts are a curated conformance gate, not an online SLO claim. Even 0/105 observed failures has a 2.81% one-sided 95% upper bound; 10/10 Completion is especially weak population evidence.

## Gate 3: real-browser walkthrough

Use the real Next.js page, real `/api/llm` route, server-built request, and production-equivalent routing flag. Provider-success rows may not use a mock. Only the failure row may inject a deterministic provider/validation failure.

| Path | Required observable result |
| --- | --- |
| `business-portrait` | contextual upstream question in `acceptableNext`; no gender/mood repeat |
| `xiaohongshu-cover` | no use-case/composition repeat; background-aware 3–6 candidates |
| `game-card` | named character, sword, and card facts survive; next question differentiates character/world |
| `virtual-idol-avatar` | transparent delivery suppresses scene and survives the final prompt |
| `explicit-scene` | exact background/light/pose are not repeated; another weak pillar advances |
| `couple-invitation` or `company-team` | multi-person identity and relationship survive questions and final prompt |
| `fully-specified-zero-turn` | no question flashes; legal Completion and usable final prompt |
| `business-portrait-after-use-case` | submitted use case changes the next question and is not repeated |
| `sparse-budget-last-turn` | exactly one legal Ask; no turn 11 or invented Completion |
| `detailed-budget-last-turn` | exactly one legal Ask; no repeated scene/pose/style fact |
| injected provider/validation failure | marked fallback, usable UI, working manual retry, no false model pass |

Every row records the Subject brief, answers, rendered question/helper and candidate IDs, one exercised Free-text submission, network status, user-visible latency, console errors, final prompt, trace ID, cohort, and first-Ask/final-Completion screenshot or short recording.

All rows must pass. Every completed walkthrough session must cost at most `$0.02` using actual provider usage and the price-table date captured by the run.

The first implementation uses a manual, reproducible walkthrough ledger. Do not add a repository Playwright dependency until repeated manual execution becomes the bottleneck.

## Telemetry and privacy contract

### Trust boundary

The first accepted `/api/llm` request creates an opaque Journey ID and a signed journey token. Using a dedicated server secret and Node's built-in cryptography, the token binds the Journey ID, release, cohort, turn index, accepted-state digest, consent version/time, raw-content sample result, `issuedAt`, and `expiresAt`. Cohort is derived on the server from `release + Journey ID`; it is never accepted from the browser.

Each accepted provider attempt receives a server-generated attempt ID before the provider call. Later turn requests must present a valid, unexpired journey token and extend the signed state with an answer to the previously accepted Ask. The server returns an updated token that expires after 30 minutes. A manual retry may reuse the same signed turn state, but it creates a new attempt ID and is counted as a retry. `/api/llm` and the public telemetry route reject expired tokens.

The server records provider status, model metadata, latency, usage, cost, validation, source, state transition, and cohort at the `/api/llm` boundary. A caller-supplied session, cohort, provider result, release, or calculated cost is ignored.

The public browser telemetry route is non-authoritative. It accepts only allowlisted outcome events and raw-content fields permitted by a valid signed journey token, derives an idempotency key from the signed journey/turn/event identity, and rejects or discards every other field. Server-derived canary metrics never trust client claims about Completion, retries, abandonment, provider behavior, cost, or cohort.

### Content-free operational telemetry

All canary sessions record:

- opaque Journey, turn, and attempt IDs;
- control/canary cohort, environment, release, and contract/prompt/catalog hashes;
- question ID, Eligible IDs, rendered candidate IDs, action, turn count, and budget class;
- HTTP status, returned model, response ID, `system_fingerprint`, `finish_reason`, elapsed time, bytes, token/cache usage, and USD;
- validation/fallback reason, source, state transition, and telemetry-ingestion status.

This always-on record excludes the Subject brief, user Free-text, answer values, history content, raw provider/tool content, and final prompt. Do not log API keys, authorization headers, IP addresses in the application payload, or a content-derived DeepSeek `user_id`.

Required server-event telemetry completeness is at least 99%, calculated as follows:

- denominator: unique attempt IDs created after signed-journey and request validation but before a provider call, taken from an independent deployment request log or durable counter, once their creation time is at least 15 minutes old;
- numerator: denominator attempt IDs with exactly one terminal telemetry record acknowledged by the telemetry store within 15 minutes;
- deduplication key: attempt ID;
- scope: one release, environment, cohort, and canary stage.

Newer attempt IDs remain `pending` and do not enter the rate. Once mature, an ID without a terminal record is `missing`. The independent denominator source must be configured before Canary 1. If it or the telemetry store is unavailable, the canary pauses and cannot advance. Client unload/outcome delivery is reported separately and is not used as the 99% denominator.

### Raw-content diagnostic sample

- Consent is explicit and off by default. The server records its version and acceptance time in the signed journey token.
- Only consented journeys are eligible.
- A stable server-side sample selects 20% of eligible journeys for the entire journey and records the sample bucket.
- Only a sampled, consented journey token authorizes raw-content storage or final-prompt upload. Without that capability, the server discards all raw fields even if a public client sends them.
- The sample may retain Subject brief, user Free-text, answer history, final prompt, and untouched provider/tool content needed for semantic diagnosis.
- Raw content carries `expiresAt` and is retained for 14 days, access-restricted, then deleted.
- Per-attempt content-free records carry `expiresAt` and are retained for 30 days.
- Content-free aggregate metrics are retained for 90 days; after 30 days they contain no Journey- or attempt-level records.
- Raw production content is never checked into the repository or release bundle.

The consent text must state the sampled raw fields and 14-day deletion. Before Canary 1, test that unsigned, unconsented, and unsampled uploads cannot persist raw fields. Before full enablement, produce deletion evidence for expired raw and per-attempt records. If the configured telemetry platform cannot enforce those expiries, raw sampling remains disabled and full enablement is blocked until the retention control is verified.

Recommended copy:

> 同意：本次人物描述、自由文本、回答历史、最终提示词及模型原始响应/工具参数，将有 20% 概率被抽样用于改进向导；抽中的原始内容最多保留 14 天。未勾选时只记录不含内容的运行状态和错误指标。

## Gate 4: controlled canary

### Assignment and stages

- Assign a server-signed Journey to one cohort for its entire session; never switch routes mid-session.
- Keep the fixed-order route as control and rollback path.
- Run only one Adaptive routing canary at a time.

| Stage | Exposure | Minimum completed Adaptive sessions | Minimum continuous time at stage |
| --- | ---: | ---: | ---: |
| Canary 1 | 10% | 50 | 48 hours |
| Canary 2 | 50% | 200 cumulative | 72 hours after promotion |
| Full | 100% | both prior stages passed | rollback drill passed |

Promotion requires both the session count and elapsed time. The same release/environment/time range must also contain at least 50 completed control journeys for Canary 1 and 200 for Canary 2.

### Metric definitions

- Started Journey: the first accepted, server-signed attempt.
- Completed Journey: the server accepts legal Completion for that Journey.
- Abandoned Journey: no legal Completion and no later accepted attempt within 30 minutes after its last accepted attempt.
- Manual-retry Journey: more than one accepted provider attempt uses the same signed turn index and state digest.
- Abandonment and manual-retry rates: matured Abandoned or Manual-retry Journeys divided by Started Journeys in the cohort; journeys still inside the 30-minute inactivity period are excluded.
- Operational-failure rate: unique Operational-failure attempts divided by all accepted provider attempts.
- p95 latency: nearest-rank p95 over end-to-end elapsed milliseconds for all accepted attempts, including failures and timeouts.
- Completed-Journey cost: every provider call from Journey start through legal Completion, including failed calls, fallbacks, and manual retries; optional post-Completion polishing is reported separately and excluded.

Control and canary comparisons use the same release, environment, and non-overlapping time range, the same metric algorithms, and the minimum control denominators above.

### Canary budgets

| Metric | Go condition |
| --- | ---: |
| Confirmed zero-tolerance violation | 0 |
| Required server telemetry completeness | at least 99% |
| Operational-failure attempt rate | at most 2% |
| Adaptive-turn p95 latency | at most 10 seconds and at most 125% of control p95 |
| Actual provider cost per completed Adaptive session | at most `$0.02` |
| Abandonment rate | no more than 5 percentage points above control |
| Manual-retry rate | no more than 5 percentage points above control |

Operational windows are fixed, non-overlapping UTC hours; an attempt belongs to the hour containing its start time. A bucket is evaluable only after it contains at least 20 Adaptive attempts and 20 control attempts. Otherwise merge it only with immediately following unevaluated hours until both denominators reach 20. Close that bucket once, never reuse its attempts, and compare the cohorts from that same time range. Two consecutive evaluated buckets above an operational budget roll back the canary.

Any confirmed zero-tolerance violation or server telemetry completeness below 99% pauses and rolls back immediately. At each stage checkpoint, abandonment or manual-retry regression above 5 percentage points also rolls back. Sampled raw-content traces are diagnostic; any confirmed zero-tolerance violation found there uses the same immediate rule.

After a rollback or code/prompt/catalog change, start a new release and experiment ID. Do not combine pre-fix attempts with the new window. Exercise the rollback path before 100% enablement.

## Release artifacts

The accepted offline gate bundle contains synthetic fixture data only:

- `run-config.json` — versions, hashes, randomization, concurrency, price table, and command;
- `observations.jsonl` — all replay or 105 live observations;
- `summary.json` — exact numerators, denominators, percentiles, cost, and gate result;
- `report.md` — human-readable findings and failed-attempt links;
- `browser-walkthrough.md` — matrix evidence and local screenshot/recording references.

The accepted bundle and its SHA-256 hashes are the versioned release record. Langfuse is the query surface, not the sole evidence store. Production raw-content samples never enter this bundle; `canary-summary.md` contains only aggregate content-free metrics.

## Minimum implementation plan

1. Land the one-call server turn contract first. The runtime, replay mode, and live evaluator must import the same production request builder, parser, validator, fallback logic, and UI projection.
2. Add one `.research/scripts/eval-adaptive.mjs` entrypoint with `--mode replay|live`; each mode writes the same observation/report shape and exits nonzero on a failed gate. Reuse Node standard library, the installed `tsx`, existing fixture/schema/prompts, and the existing DeepSeek key name `CIPG_EVAL_API_KEY`.
3. Add one focused evaluator test file and one checked-in recorded-response corpus covering the minimum replay table. Do not retrofit the legacy full-session seed harness into this gate.
4. At the server turn boundary, issue and verify a 30-minute HMAC-signed journey token and server attempt IDs. Derive release/cohort/state transitions there; use Node standard library and a dedicated deployment secret, not a new identity or feature-flag service.
5. Extend server-side turn telemetry with the content-free fields and independent attempt denominator above. Restrict the public telemetry route to signed, allowlisted, idempotent outcome/raw uploads. Keep raw content behind versioned consent, stable 20% sampling, explicit expiries, and deletion proof.
6. Add a server-derived, Journey-sticky `0|10|50|100` routing percentage and preserve the fixed route at `0`. Reuse deployment configuration; do not add a feature-flag service.
7. Run `npm run verify`, deterministic replay, the 105 live gate, and the real-browser matrix. Only then start Canary 1.

Expected commands:

```bash
npm run verify
npm run eval:adaptive -- --mode replay --input .research/adaptive-question-recordings.jsonl --out <dir>
CIPG_EVAL_API_KEY=... npm run eval:adaptive -- --mode live --out <dir>
npm run dev
```

No-go at any stage leaves the fixed route enabled and produces a failed report. A two-call challenger, repository Playwright dependency, online `acceptableNext` metric for arbitrary briefs, and automatic provider retry are out of scope unless measured evidence later makes them necessary.
