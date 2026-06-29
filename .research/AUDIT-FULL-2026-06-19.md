# thoth 全面审计报告（四路子 Agent 合成）

> 日期：2026-06-19  
> 分支：`feat/autofill-heuristic-core`（PR #2）  
> 方法：架构探索 × 代码审查 × 数据层审计 × eval 基础设施审计  
> **替代** 此前草率的 `PONYTAIL-SIMPLIFY-PLAN.md`（仅以本报告为准）

---

## 执行摘要

| 维度 | 结论 |
|------|------|
| **代码精简** | 有明确 dead code（M001 整条路径），有重复（autofill 三处拷贝），**不宜**拆 `gradient.ts` / options catalog |
| **正确性** | PR #2 合并前应修 **HIGH**：`finishNow` session 竞态；**MEDIUM**：`computeFillSet` 缺 `applyPropsQuestionDemotion` |
| **数据层** | 无 SQL；**最大缺口**是 `image_hair` 无发色选项（银发只能靠 seed 文本） |
| **Eval** | harness 与生产对齐好；**eval-report 指标已失效**（仍统计不存在的 `done`/`forcedDone`） |

**原则（用户约束）**：删 **代码**、不删 **选项 catalog 内容**。

---

## 一、架构与 Dead Code（探索 Agent）

### P0 — 可删（低风险）

| ID | 发现 | 路径 |
|----|------|------|
| D-01 | M001 demo worktype 仅 init 校验，UI 未用 | `image-prompt-m001-demo.worktype.ts`, `init.ts:17-22` |
| D-02 | `m001/publish-aspect.ts` 零引用 | `src/lib/prompt/m001/` |
| D-03 | 生产 UI 绕过 registry，直接用 `imagePromptAgentWorkType` | `use-agent-guide-controller.ts` vs `work-type.registry.ts` |

### P0 — 应合并（中风险）

| ID | 发现 | 建议 |
|----|------|------|
| U-01 | Controller autofill 重复 2 次 | 提取 `applyAutofillToHistory` |
| U-02 | `eval-agent.mjs:384-421` 再抄一遍 | eval 调用同一 helper |

### P1 — 死导出 / 测试专用

- `getAllWorkTypes`、`requestNextStep`（仅 parity 测试）、`validation.ts`（仅测试）、`portrait-prompt-analysis.ts`（仅 research）
- `eval-agent.mjs` 未使用的 `parseTurnResponse` import

### 不碰

- `options/image/*.ts` 全部内容
- `gradient.ts` 语义数据
- `fill.ts` / `fill-boost.ts` §7 契约（`fill.test.ts` 720 行锁定）
- `client.ts` seed-faithfulness 提示词
- `adapters → brief → renderer` 确定性链

### 建议 PR 顺序

```
PR-A  删 M001 死路径
PR-B  统一 autofill 编排（controller + eval）  ← 与 PR #2 强相关
PR-C  work-type 单一真相源（registry vs agent worktype）
PR-D  client.ts 文件拆分（polish / autofill 移出，无新抽象）
PR-E  eval harness 去重 + 修 report
PR-F  死导出清理
PR-G  buildSubjectScopedIndex 层倒置修复
```

---

## 二、正确性审查（Code Reviewer Agent）

### 合并 PR #2 前必须修

| 严重度 | 问题 | 位置 |
|--------|------|------|
| **HIGH** | `finishNow` 无 `sessionRef` guard，restart 后旧 autofill 写入新 session | `use-agent-guide-controller.ts:515-552` |
| **MEDIUM** | `computeFillSet` 未调 `applyPropsQuestionDemotion`，autofill 可能塞 `character_props` | `fill.ts:114-115` |
| **MEDIUM** | transport 重试不区分 4xx/5xx，错误 key 会 3 次延迟后静默 fallback | `client.ts:414-452` |
| **MEDIUM** | autofill 逻辑 fetchNext/finishNow 重复且已分叉 | `controller:269-307` vs `519-541` |

### 技术债（可排期）

- `TurnDiagnostics` 遗留哨值字段（always false）
- `routePrimaryType(description)` 参数未使用
- 生产环境 `DebugLogPanel` 无条件渲染
- `buildSubjectScopedIndex` 模块加载执行两次
- `agent-demo-client` 硬编码 `"deepseek"` 而非 `DEFAULT_PROVIDER_ID`

### 测试缺口

1. `finishNow` + 立即 `restart` 竞态
2. transport 401/403 不应重试
3. outfit+pose seed 同时命中时的 XOR policy

---

## 三、数据层审计（Catalog =「数据库」）

### 结论：**不需大规模重组；需增补发色**

| Section | Catalog | 缺口 |
|---------|---------|------|
| **hair** | 9 项，仅造型/长度 | **无银发/黑发/金发**；heuristic 只能选 `长直发` 等 |
| **lighting** | 26 项 | 充足 |
| **pose** | 8 项 | 历史 eval pose A%=0%；close_up suppress；P0-1 已修逻辑待复 eval |
| interaction | 与 pose/props 语义重叠 | scope 已收窄，叠层可接受 |

### 三套顺序（刻意分离，非 bug）

1. **提问**：`gradient.order`
2. **主体短语**：`SCOPED_DIM_ORDER`（renderer）
3. **模板段**：`TEMPLATE_RENDER_ORDER`

### 数据层建议（增补，非删减）

1. **`image_hair` 增补发色选项**（或 `hair_color` 维）— P0 数据
2. heuristic 发色 signal → option id 映射
3. telemetry 增加 `autoFilledDimensions[]`、`catalogVersion`（对齐 eval）
4. **不动**：33 套 option 规模、constraints 自动注入、DIM_TO_SECTION 历史映射

---

## 四、Eval 基础设施审计

### P0 — 报告已坏

`eval-report.mjs` 仍统计 `done` / `noRemaining` / `forcedDone`，但 C-9b 后 harness 只产出 `remainingEmpty` / `maxTurns` / `done_empty` 等 → **selfDoneRate 等恒为 0 或误导**。

### P0 — 路径陷阱

- 默认 `--seeds` → `.research/eval-seeds/seeds.txt`（**不存在**）
- corpus 默认 → `/Users/klaus/Downloads/...`（**本机路径**）

### P1 — 漂移

| eval | UI |
|------|-----|
| simple maxTurns **10** | H3 ceiling **28** |
| 无 polish | 有 polishPrompt |
| 直连 API | `/api/llm` |

### 已有能力（扩展前不必重做）

- `--provider` + `--answerer-provider` 双 provider
- `--rounds` / `--workers` / `--label`

### 建议顺序

**先修 report + 路径 + fixture 测试 → 再扩展三角色轮换 eval**

---

## 五、统一行动路线图

### Phase 0 — PR #2 合并前（阻塞）

- [ ] 修 `finishNow` session guard
- [ ] `fill.ts` 加 `applyPropsQuestionDemotion`
- [ ] 合并 autofill 重复（或至少 finishNow 与 fetchNext 同 guard）

### Phase 1 — 合并后、精简前（Ponytail）

- [ ] PR-A：删 M001 + `m001/`
- [ ] PR-B：共享 `applyAutofillToHistory`
- [ ] PR-E：重写 `eval-report.mjs`；修默认 seeds 路径

### Phase 2 — 数据增补（非删减）

- [ ] `image_hair` 发色选项 + 测试
- [ ] 复跑 StepFun/DeepSeek eval + `compare-corpus`

### Phase 3 — 架构债

- [ ] work-type registry 与 agent worktype 对齐
- [ ] telemetry 结构化字段
- [ ] 三 API 角色轮换 harness（seed / routing / answerer）

### Phase 4 — 生产决策

- [ ] **Routing 默认 DeepSeek**（StepFun ~8.5s/轮不可接受）
- [ ] 生产隐藏 `DebugLogPanel`

---

## 六、Skills 使用约定

| Skill | 何时用 |
|-------|--------|
| **ponytail** (full) | 所有代码 PR：YAGNI、最短 diff、先读再改 |
| **caveman** | Agent 交接、状态同步 |
| **refactor-cleaner** | PR-A/F 前 knip 扫 dead |
| **code-reviewer** | 每个 PR 合并前 |
| **code-simplifier** | PR 合并前收一遍 |

数据层改动：**不**用 ponytail 删选项；用 catalog 审计结论做 **增补**。

---

## 七、关键路径索引

```
生产核心
  src/lib/prompt/agent/client.ts
  src/lib/prompt/agent/fill.ts
  src/lib/prompt/agent/fill-boost.ts
  src/lib/prompt/agent/active-dimensions.ts
  src/components/prompt-guide/use-agent-guide-controller.ts

数据层（不删减）
  src/lib/prompt/options/image/*.options.ts
  src/lib/prompt/agent/gradient.ts
  src/lib/prompt/work-types/image-prompt-agent.worktype.ts

Eval
  .research/scripts/eval-agent.mjs
  .research/scripts/eval-report.mjs      ← 需重写
  .research/scripts/compare-eval-corpus.mjs
  .research/eval-seeds/portrait-seeds-combined.txt

死代码候选
  src/lib/prompt/work-types/image-prompt-m001-demo.worktype.ts
  src/lib/prompt/m001/publish-aspect.ts
```

---

## 八、子 Agent 引用

| 审计 | Agent ID |
|------|----------|
| 架构 / dead code | `ca006e63-a9b8-4e47-a076-524e194919fd` |
| 代码正确性 | `4d32ebd9-d789-43a1-a534-d43b3542eb7a` |
| 数据层 catalog | `7a958307-3fc9-4e45-8778-adba8d2b56fc` |
| Eval 基础设施 | `0c3af096-7ef2-4c04-8dc6-d18957a2fab4` |

---

*本报告可提交至 git（路径 `.research/AUDIT-FULL-2026-06-19.md`，不在 `.gitignore`）。*
