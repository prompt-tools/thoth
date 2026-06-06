# Controllable Image Prompt Guide / 可控图片提示词向导

## Project / 项目

An **image-only** prompt wizard forked from [controllable-prompt-guide](https://github.com/prompt-tools/controllable-prompt-guide). Users build copy-ready image prompts through guided choices — no typing, no jargon, no paid APIs.

面向非专业用户的**图片**提示词向导（从双工种主仓库拆出）。只需做选择题，把需求转成可复制到通用图片模型里的专业提示词。

- **Image-only / 仅图片**: `image_prompt` + `generic_image` — no video work type or targets
- **Config-driven / 配置驱动**: New options live under `options/image/`
- **Selection-first UX / 选择优先**: All input is choice-based
- **Deterministic rendering / 确定性渲染**: Template stitching, not AI rewriting
- **Static export / 静态导出**: `npm run build` → `out/`

## Stack / 技术栈

Next.js 15, TypeScript 5.7, React 19, Tailwind CSS v3, Vitest 3

## Architecture / 架构

```
src/lib/prompt/
├── registry/
├── init.ts
├── adapters.ts
├── brief.ts
├── heuristics.ts
├── types.ts
├── validation.ts
├── options/image/          # Image option catalogs only
├── targets/generic-image.target.ts
├── renderers/generic-image.renderer.ts
└── work-types/image-prompt.worktype.ts
```

## Commands / 命令

```bash
npm run dev
npm run verify       # typecheck + lint + test + build (CI gate)
npm test
npm run typecheck
npm run build
codegraph init -i    # optional: local code intelligence index
```

## Fix workflow / 修复流程

Delivery protocol **v3** (adopted): `docs/process/WORKFLOW-v3.md` — triage, role split, git verdicts, `npm run verify`, CI `protocol` check.  
Step 6/8 criteria text: `.planning/REVIEW-PROTOCOL.md` v2.1.  
Optional hooks: `git config core.hooksPath .githooks`

## Sister repo / 姊妹仓库

Video + dual work-type switching remains in **prompt-tools/controllable-prompt-guide**.
