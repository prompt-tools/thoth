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
│       └── telemetry/route.ts        # Per-step session recording → Langfuse
├── components/prompt-guide/
│   ├── agent-demo-client.tsx         # Wizard UI (describe → ask → done)
│   ├── use-agent-guide-controller.ts # Flow state, fetch-next, auto-fill, telemetry
│   ├── option-card.tsx · output-panel.tsx · brief-preview.tsx · copy-button.tsx
│   └── error-boundary.tsx
└── lib/prompt/
    ├── agent/                        # Rule routing + AI candidate filtering
    │   ├── client.ts                 # buildTurnRequest / autoFill (seed-aware)
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
| `DEMO_DEEPSEEK_KEY` | Built-in model key injected by `/api/llm` (api.deepseek.com only) |
| `ADAPTIVE_TURN_SECRET` | HMAC secret of at least 32 UTF-8 bytes, binding every Adaptive answer to the previously accepted Ask |
| `ADAPTIVE_ROUTING_ENABLED=1` | Enable the server Adaptive turn boundary; absent keeps the fixed route |
| `LANGFUSE_BASE_URL` / `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | Telemetry sink; absent → telemetry is a no-op |

Public build-time flags:

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_AGENT_DEMO_BUILTIN=1` | Skip the BYOK key gate and use the built-in key |
| `NEXT_PUBLIC_ADAPTIVE_ROUTING=1` | Send browser turns through the Adaptive boundary |

## Commands / 命令

```bash
npm run dev
npm run verify       # typecheck + lint + test + build (CI gate)
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
