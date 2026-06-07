# Changelog

## Unreleased

### Agent 质量优化：选题精准度 & 约束引导

**问题背景**

通过对真实用户会话（"橘色小猫"）的 telemetry 回放分析，发现以下问题链：

1. Subject 维度向模型发送全量 20+ 个选项 → 模型筛选失效，"食物/饮品"出现在动物流程
2. 第一题无推荐标记（`suggestedIdsFor` 依赖已选 id，首轮恒为空） → 用户选错 `wildlife`（应为 `pet_animal`）
3. 错误 subject 触发错误的 scene 推荐（wildlife → natural_landscape）
4. `constraints` 在动物流程排最后 + 无默认值 → 跳过率高，解剖错误漏入最终 prompt
5. `constraints` 在 `动物.essential` 和 `shared.essential` 同时存在（冗余数据）

**改动**

#### `src/lib/prompt/agent/catalog-manifest.ts`
- 新增 `getTypeFilteredSubjectOptionIds(type)` — 通过 OptionSet registry 读取 `image_subject.categories`，按 primaryType 返回匹配的 option id 集合（动物→`{pet_animal, wildlife}`；人像→人物类；产品→产品类；等）

#### `src/lib/prompt/agent/client.ts`
- `TurnContext` 新增 `filteredCurrentOptionIds: string[]` 字段
- `buildTurnRequest`：subject 维度按 primaryType 预过滤选项后再发给模型，并写入 `ctx.filteredCurrentOptionIds`
- `parseTurnResponse`：fallback（模型返回空时）改用 `filteredCurrentOptionIds`，不再退回全量 20+ 选项
- 传输错误 fallback 路径同步修复

#### `src/lib/prompt/agent/routing.ts`
- 新增 `suggestedIdsFromDescription(description, type)` — 纯函数，按宠物/野生信号词将描述文字映射到 subject 推荐 id（`猫/狗/宠物/兔/仓鼠` → `pet_animal`；`野生/狮/虎/狼` → `wildlife`）

#### `src/components/prompt-guide/use-agent-guide-controller.ts`
- `suggestedIds` useMemo：当 `decision.nextQuestionId === "subject"` 时，合并 `suggestedIdsFromDescription()` 的结果，使第一题能出现推荐徽章
- `fetchNext`：constraints 题按 primaryType 预选默认值（`动物`/`人像` → `no_bad_anatomy`），用户可直接提交而无需主动寻找选项

#### `src/lib/prompt/agent/gradient.ts`
- 动物 `essential`：移除冗余的 `constraints` 条目（已由 `shared.essential` 覆盖）
- 动物 `order`：在 `lighting` 之后插入 `"constraints"`，使其出现在第 5 步而非最末步
- 更新文件头注释（标记为手动维护，记录 patch 要点）

**新增测试**

- `active-dimensions.test.ts`：断言动物 simple 精度下 `constraints` 在 `aspect_ratio` 之前
- `run-agent-turn.test.ts`：断言动物 subject 题的选项 JSON 仅含 `pet_animal` + `wildlife`；fallback 也使用过滤后集合

**结果**：183 个测试全部通过，`npm run verify`（typecheck + lint + test + build）无错误。

---

## v0.1.0 — 2026-06-06

初始上线版本。AI 自适应图片提示词向导，部署于 Vercel。

- AI agent 动态决定下一题及候选选项（DeepSeek via `/api/llm` 服务端代理）
- 简单 / 专业两档精细度（`simple` / `standard` / `detailed`）
- 二阶段生成：交互问答 → LLM 自动补全次要维度（autofill）
- 可选润色（`polishPrompt`）
- 中文 / 英文 prompt 双输出，支持复制 JSON brief / Markdown
- Langfuse telemetry（per-step 记录）
- 内置 key，用户零配置
