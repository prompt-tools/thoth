# thoth — 可控图片提示词向导（上线版）

## Project / 项目

An **image-only** prompt wizard. Portrait rules decide which question to ask next
based on what the user has already chosen, while a lightweight AI agent narrows
that question's option catalog; the final prompt is **deterministically stitched** from the selected
options (no AI rewriting of meaning). Forked from
[controllable-prompt-guide](https://github.com/prompt-tools/controllable-prompt-guide)
and decoupled into a clean, user-facing production app.

面向非专业用户的**图片**提示词向导(上线版)。系统根据人像规则和已有选择决定下一题，
轻量 AI agent 为该题收窄候选选项；最终提示词由选中的选项**确定性拼接**(不靠 AI 改写语义)。
从主仓库拆出,与评测/旧版彻底解耦,只保留面向用户的现版本。

- **Image-only / 仅图片**: `image_prompt` + `generic_image` — no video work type
- **Rule-routed / 规则路由**: rules pick the next dimension; AI narrows its candidates
- **Selection-first / 选择优先**: all input is choice-based (no typing required)
- **Deterministic render / 确定性渲染**: template stitching, not AI rewriting
- **Server app / 服务端应用**: runs on Vercel; `/api/llm` calls the model with a
  built-in key (owner-funded) so users need no key of their own

## Stack / 技术栈

Next.js 15, TypeScript 5.9, React 19, Tailwind CSS v3, Vitest 4

## Architecture / 架构

```
src/
├── app/
│   ├── page.tsx                      # Home = the portrait prompt wizard
│   └── api/
│       ├── llm/route.ts              # Server proxy → model provider (built-in key)
│       ├── telemetry/route.ts        # Signed content-free outcome events → Upstash
│       └── raw-content/route.ts      # Signed completion diagnostics (disabled by default)
├── components/prompt-guide/
│   ├── agent-demo-client.tsx         # Wizard UI (describe → ask → done)
│   ├── use-agent-guide-controller.ts # Flow state, fetch-next, auto-fill, telemetry
│   ├── option-card.tsx · output-panel.tsx · brief-preview.tsx · copy-button.tsx
│   └── error-boundary.tsx
└── lib/prompt/
    ├── agent/                        # Rule routing + AI candidate filtering
    │   ├── client.ts                 # buildTurnRequest / autoFill (seed-aware)
    │   ├── raw-content-store.ts      # Separate server-only write boundary/store for approved raw diagnostics
    │   ├── active-dimensions.ts      # which dims are active for a precision tier
    │   ├── decision.ts · fill.ts · catalog-manifest.ts · debug-log.ts
    ├── options/image/                # Image option catalogs only
    ├── renderers/generic-image.renderer.ts
    ├── targets/generic-image.target.ts
    ├── work-types/image-prompt.worktype.ts
    ├── registry/ · init.ts · adapters.ts · brief/ · heuristics.ts
    └── types.ts · validation.ts
```

## Runtime config / 运行时配置

Server-only env vars (never `NEXT_PUBLIC_`, never in the browser bundle):

| Var | Purpose |
|-----|---------|
| `DEMO_DEEPSEEK_KEY` | Built-in model key used only from server provider boundaries |
| `ADAPTIVE_TURN_SECRET` | HMAC secret of at least 32 UTF-8 bytes, signing Journey and accepted-Ask state |
| `JOURNEY_RELEASE` | Stable release identifier used in signed Journey claims and Canary assignment; falls back to `VERCEL_GIT_COMMIT_SHA`, then `local` |
| `ADAPTIVE_CANARY_EXPOSURE=0|10|50|100` | Percentage of new Built-in Journeys assigned to Adaptive; defaults to `0` |
| `ADAPTIVE_ROUTING_ENABLED=1` | Allow non-zero Adaptive exposure and the legacy BYOK Adaptive boundary; absent forces new Built-in Journeys to fixed |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Durable server-only store for content-free Journey attempt lifecycles and outcome events; Built-in provider calls fail closed when unavailable |
| `RAW_CONTENT_REDIS_REST_URL` / `RAW_CONTENT_REDIS_REST_TOKEN` | Dedicated server-only raw-store credential variables; deployment-owner store isolation and ACL verification required; never browser credentials |
| `RAW_CONTENT_SAMPLING_ENABLED=1` | Enables the stable server-side 20% raw-content sample gate |
| `RAW_CONTENT_RETENTION_VERIFIED=1` | Confirms deployment-owner evidence for raw TTL deletion, access controls, and provider backup/log retention; required with sampling flag for raw writes |

Public build-time flags:

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_AGENT_DEMO_BUILTIN=1` | Skip the BYOK key gate and use the built-in key |
| `NEXT_PUBLIC_ADAPTIVE_ROUTING=1` | Enable the legacy BYOK Adaptive boundary; Built-in cohort routing is server-owned |

### Public outcome events

`/api/telemetry` accepts only three content-free event types. Each must match the
state in the current server-signed Journey token:

| Event | Required signed state |
|-------|-----------------------|
| `answer_submitted` | `ask` |
| `turn_skipped` | `ask` |
| `prompt_rendered` | `done` |

The server derives Journey, release, route, turn, state, and question identity
from the token. Other client fields are discarded. The signed content-free
Journey/turn/attempt records remain independent of raw consent and expire after
30 days. Anonymous UTC-day aggregates contain no Journey or attempt IDs and
expire after 90 days.

## Raw diagnostic capture / 原始诊断留存

UI raw-diagnostic consent is explicit and off by default. Only a stable
server-side 20% of consented Journeys qualifies; retries remain in the same
sample. Approved raw content includes the Subject brief, each answer's
`questionId`/selected-option IDs/free text, the final Chinese and English
prompts recomputed server-side from the signed Journey snapshot, and this
provider allowlist: the first OpenAI choice's `finish_reason`, message text,
`tool_calls[].function.name`, and untouched `arguments`; or Anthropic
`stop_reason`, text blocks, and `tool_use` name/input. Each raw record also
retains internal correlation/expiry metadata: `version`, `journeyId`,
`release`, `route`, `turn`, provider-record `delivery`, `recordedAt`, and
`expiresAt`; these are not provider response IDs. Provider response IDs (OpenAI
`id`/`tool_calls[].id`, Anthropic `tool_use.id`), model, usage, system
fingerprints, headers, and other provider metadata are discarded. For Built-in
fixed completion, the browser sends the completed history, including
fixed-route auto-fill, through the Journey completion boundary. The server
validates that canonical extension and issues a Done token bound to the final
snapshot before rendering and raw final-prompt recomputation. Raw expires
within 14 days and every write goes through `raw-content-store.ts` using the
dedicated server-side raw credential variables; deployment-owner store
isolation and ACL verification are still required. Completion diagnostics enter
through `/api/raw-content`; provider content is captured directly at the server
Journey boundary. No raw read API exists. Browser keys, repository/build
artifacts, and replay artifacts are excluded.

Raw writes require both `RAW_CONTENT_SAMPLING_ENABLED=1` and
`RAW_CONTENT_RETENTION_VERIFIED=1`, plus `RAW_CONTENT_REDIS_REST_URL` and
`RAW_CONTENT_REDIS_REST_TOKEN`. Every raw-store key is written with an
absolute `PXAT` no later than `recordedAt + 14 days`; that constrains only the
Redis key TTL. It does not prove ACLs, backup retention, log retention, or
provider/all-media retention. Production raw remains blocked/off in this
implementation: the deployment owner must independently verify each gate,
and `RAW_CONTENT_RETENTION_VERIFIED=1` stays unset in production until those
checks pass. The default-skipped `npm run verify:retention-live` check must be
run only against isolated non-production Redis with these test-only variables
and the exact isolation acknowledgement:

```text
RAW_RETENTION_TEST_ISOLATION_ACK=I_UNDERSTAND_ISOLATED_NON_PRODUCTION
RAW_RETENTION_TEST_RAW_REDIS_REST_URL
RAW_RETENTION_TEST_RAW_REDIS_REST_TOKEN
RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_URL
RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_TOKEN
```

The check creates random short-lived probe keys and verifies that each key is
first visible and then deleted. A missing acknowledgement or test credential
fails the check; it does not read the production `RAW_CONTENT_REDIS_REST_*` or
`UPSTASH_REDIS_REST_*` credentials. This implementation did not run that
check. Upstash's ordinary public terms do not currently prove that
backups, logs, or all media are deleted within 14 days, so a passing TTL probe
cannot replace the deployment owner's ACL, backup, log, and all-media
retention verification. If evidence is missing, content-free telemetry
continues and raw stays disabled. This file does not claim that the current
Vercel deployment is configured or that live deletion passed.

## Commands / 命令

```bash
npm run dev
npm run verify       # typecheck + lint + test + build (CI gate)
npm run verify:retention-live  # isolated non-production Redis only; explicit opt-in
npm test
npm run typecheck
npm run build
codegraph init -i    # optional: local code intelligence index
```

## Sister repo / 姊妹仓库

Video + dual work-type switching, plus the eval/test harness, stay in
**prompt-tools/controllable-prompt-guide** (and its eval fork). thoth carries
production code only.

## Agent skills

### Issue tracker

Issues and PRDs live in GitHub Issues for `prompt-tools/thoth`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo. See `docs/agents/domain.md`.
