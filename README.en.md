<!--
Language switcher / 语言切换
-->

[中文](./README.md) | English

---

# thoth · Portrait & Character Prompt Guide

> A **portrait and character** prompt wizard for non-expert users. Turn vague
> ideas like attractive women/men, game characters, novel protagonists, otome
> characters, and virtual idols into copy-ready prompts through guided choices.
>
> **v0.1.0** — rule-routed build with AI candidate filtering, live on Vercel. Feedback welcome.

## Try it

**[https://thoth-rho.vercel.app](https://thoth-rho.vercel.app)** — open in any
browser. No sign-up, no install, no key required.

Local:

```bash
git clone https://github.com/prompt-tools/thoth.git
cd thoth
npm install
npm run dev
```

## How it works

1. Describe the person or character in one line (or skip).
2. Portrait rules choose the next question from what you have already answered;
   AI then narrows that question's candidate options instead of dumping every field at once.
3. Dimensions you skip are **auto-filled** to match your chosen style (editable in
   the result).
4. The final prompt is **deterministically stitched** from your selected options —
   no AI rewriting of meaning. Quality negatives and minor-protection constraints
   are **appended automatically** — no separate step. Outputs Chinese + English prompts.

Two precision tiers: **Simple** (a few core questions) / **Pro** (asks more, with a
per-question "show all options" disclosure).

## Why

Most image tools expect stacked keywords and style jargon. This wizard breaks
dimensions into understandable choices.

- **Zero typing** — selection-based input
- **Free for users** — no key needed; model usage is owner-funded
- **Zero login**
- **Instant copy** — Chinese prompt, English prompt, JSON brief, Markdown

## Stack and data boundaries

Next.js 15 · TypeScript 5.9 · React 19 · Tailwind CSS v3 · Vitest 4. Deployed on
Vercel: `/api/llm` proxies the model server-side (built-in key).

- `/api/telemetry` accepts only content-free outcome events that match the current server-signed Journey state. Signed content-free Journey/turn/attempt records are independent of raw consent and expire after 30 days.
- Anonymous UTC-day aggregates retain counters only: they contain no Journey or attempt IDs and expire after 90 days.
- `src/lib/prompt/agent/raw-content-store.ts` handles every raw-diagnostic write through dedicated server-side raw credential variables; the deployment owner must configure and verify store isolation and ACLs. For Built-in fixed completion, the browser sends the completed history, including fixed-route auto-fill, through the Journey completion boundary. The server validates that canonical extension and issues a Done token bound to the final snapshot before `/api/raw-content` recomputes the final prompt from it. Provider content is captured at the server Journey boundary, and no raw read API is exposed. UI raw-diagnostic consent is explicit and off by default; only a stable server-side 20% of consented Journeys qualifies, and retries remain in the same sample. Approved raw content includes the Subject brief, each answer's `questionId`/selected-option IDs/free text, the server-recomputed Chinese and English final prompts, and this provider allowlist: the first OpenAI choice's `finish_reason`, message text, `tool_calls[].function.name`, and untouched `arguments`; or Anthropic `stop_reason`, text blocks, and `tool_use` name/input. Each raw record also retains internal correlation/expiry metadata: `version`, `journeyId`, `release`, `route`, `turn`, provider-record `delivery`, `recordedAt`, and `expiresAt`; these are not provider response IDs. Provider response IDs (OpenAI `id`/`tool_calls[].id`, Anthropic `tool_use.id`), model, usage, system fingerprints, headers, and other provider metadata are discarded. Browser keys, repository/build artifacts, and replay artifacts never enter raw storage.

Raw capture uses these server-side variables, and writes require both
`RAW_CONTENT_SAMPLING_ENABLED=1` and `RAW_CONTENT_RETENTION_VERIFIED=1` (plus
the raw-store credentials):

```text
RAW_CONTENT_REDIS_REST_URL
RAW_CONTENT_REDIS_REST_TOKEN
RAW_CONTENT_SAMPLING_ENABLED=1
RAW_CONTENT_RETENTION_VERIFIED=1
```

Every raw-store key is written with an absolute `PXAT` no later than
`recordedAt + 14 days`; that constrains only the Redis key TTL. It does not
prove ACLs, backup retention, log retention, or provider/all-media retention.
The client generates the initial Journey ID so a retry after a lost first
response keeps the same Journey. The server-secret HMAC prevents offline
sample prediction, but repeated online Journey creation can still skew the
sample; rate-limit new Journey creation at Vercel/WAF before enabling raw in
production.
Production raw capture remains blocked/off in this implementation. The
deployment owner must verify each access, abuse-control, and retention gate independently;
this repository has no such proof, so `RAW_CONTENT_RETENTION_VERIFIED=1` must
remain unset in production until those checks pass. `npm run
verify:retention-live` is an explicit opt-in check that is skipped by default.
Run it only against isolated non-production Redis backends with these
test-only variables and explicit isolation acknowledgement:

```text
RAW_RETENTION_TEST_ISOLATION_ACK=I_UNDERSTAND_ISOLATED_NON_PRODUCTION
RAW_RETENTION_TEST_RAW_REDIS_REST_URL
RAW_RETENTION_TEST_RAW_REDIS_REST_TOKEN
RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_URL
RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_TOKEN
```

It creates only random short-lived probe keys and verifies that each key exists
and is then deleted. A missing acknowledgement or test credential fails the
check. It does not read the production `RAW_CONTENT_REDIS_REST_*` or
`UPSTASH_REDIS_REST_*` credentials. This implementation did not run that live
check.
Upstash's ordinary public terms do not currently prove that backups, logs, or
all media are deleted within 14 days, so even a passing probe cannot replace
the deployment owner's ACL, backup, log, and all-media retention verification.
Until then, content-free telemetry continues and raw remains disabled. This
documentation does not claim that the current Vercel deployment is configured
or that live deletion passed.

Known residual risk: `npm audit --omit=dev` still reports two moderate findings in
Next's nested PostCSS with no fix available. The app does not compile user-supplied
CSS, so it does not force an unsafe dependency override; upgrade when Next ships a fix.

## Portrait Dimensions

**Retained visual dimensions:** use case · portrait subject · scene · composition · lighting · art style · color · mood · framing · camera angle · aspect ratio · detail · post-processing

**Automatic (not asked):** quality negatives (bad anatomy, low quality, distorted face, extra fingers, plastic skin, etc.) + no sexualized minors

**Portrait-specific dimensions:**
- Portrait direction — realistic portrait, beautiful woman, handsome man, game character, novel character, otome/visual novel, anime, virtual idol/OC, cosplay
- Identity features — gender presentation, age band, skin tone/texture, face/features, body type
- Character design — archetype, render style, fictional role temperament
- Styling and action — expression, pose, outfit, hair, action/interaction, prop or POV relationship

Products, animals, architecture, food, and landscapes no longer exist as subject branches; they can only appear as background, props, or scene elements.

## Related

| Repo | Purpose |
|------|---------|
| **thoth** (this repo) | Production app on Vercel |
| **[controllable-image-prompt-guide](https://github.com/prompt-tools/controllable-image-prompt-guide)** | Dev + eval repo: agent eval harness |
| **[cipg-eval-test](https://github.com/prompt-tools/cipg-eval-test)** | Private eval bed: GitHub Actions + DeepSeek scheduled runs |

## License

MIT — see [LICENSE](./LICENSE).
