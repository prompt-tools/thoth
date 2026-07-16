# Changelog

## Unreleased

### Security and reliability fixes

- The built-in demo proxy now pins its endpoint, model, token budget, and streaming mode server-side.
- Autofill cannot replace answers outside its allowed dimensions; portrait-only filtering also applies to model responses.
- Free-text subjects retain selected portrait details, and user-selected constraints are preserved alongside required defaults.
- Telemetry is opt-in and each session starts with a fresh debug log.

---

## v0.1.0 — 2026-06-06

初始上线版本。规则路由 + AI 候选筛选图片提示词向导，部署于 Vercel。

- 本地规则决定下一题，AI 筛选该题候选选项（DeepSeek via `/api/llm` 服务端代理）
- 简单 / 专业两档精细度（`simple` / `standard` / `detailed`）
- 二阶段生成：交互问答 → LLM 自动补全次要维度（autofill）
- 可选润色（`polishPrompt`）
- 中文 / 英文 prompt 双输出，支持复制 JSON brief / Markdown
- Langfuse telemetry（per-step 记录）
- 内置 key，用户零配置
