<!--
Language switcher / 语言切换
-->

中文 | [English](./README.en.md)

---

# thoth · 人像/角色提示词向导

> 面向非专业用户的**人像/人物/角色**提示词生成工具。只做选择题,把“漂亮女生/男生、游戏角色、小说人物、乙游角色、虚拟角色”等模糊需求转成可复制到通用图片模型里的专业提示词。
>
> **v0.1.0** — 规则路由 + AI 候选筛选版，上线于 Vercel。欢迎反馈。

## 立即使用

**[https://thoth-rho.vercel.app](https://thoth-rho.vercel.app)** — 浏览器直接打开即可。不用注册、不用安装、不用自带 API key。

本地开发:

```bash
git clone https://github.com/prompt-tools/thoth.git
cd thoth
npm install
npm run dev
```

## 它怎么工作

1. 用一句话说说你想要的人物或角色(也可以跳过)。
2. 系统根据人像规则和已有选择决定下一题，AI 再为该题筛选最相关的候选选项——而不是一次性铺开所有选择题。
3. 你没回答的维度,AI 会据你已选的风格**自动补全**(可在结果里删改)。
4. 最终提示词由你选中的选项**确定性拼接**生成,不靠 AI 改写语义。画质负向词与未成年保护**自动附加**,无需单独选择。输出中文 / 英文 prompt。

精细度两档:**简单**(只问几个核心问题)/ **专业**(问得更全,每题可展开全部选项)。

## 特点

- **零填空** — 全程选择题驱动
- **对用户免费** — 无需自带 key,模型额度由我们承担
- **零登录**
- **即时复制** — 中文 / 英文 prompt、JSON brief、Markdown

## 人像维度

**保留的视觉维度：** 用途 · 人物主体 · 场景 · 构图 · 光线 · 画风 · 色调 · 氛围 · 景别 · 机位 · 比例 · 细节 · 后期

**自动附加（不提问）：** 画质负向词（畸形、低画质、面部扭曲、多手指、塑料磨皮等）+ 禁止未成年性感化

**人物专属维度：**
- 人物方向 — 真人写真、漂亮女生、漂亮男生、游戏角色、小说人物、乙游/视觉小说、二次元、虚拟偶像/OC、cosplay
- 身份特征 — 性别呈现、年龄段、肤色/肤质、脸型/五官、体型/身形
- 角色设计 — 角色原型、角色呈现风格、虚构角色身份气质
- 服饰动作 — 表情、姿态、服装、发型、妆容、动作/互动、手持道具

产品、动物、建筑、食物、风景等不再作为主体分支；它们只能作为背景、道具或场景元素出现。

## 技术栈与数据边界

Next.js 15 · TypeScript 5.9 · React 19 · Tailwind CSS v3 · Vitest 4。部署在 Vercel：`/api/llm` 服务端代理调用模型（内置 key）。

- `/api/telemetry` 只接收与当前服务端签名 Journey 状态匹配的无内容结果事件。签名的无内容 Journey/turn/attempt 记录与 raw consent 无关，保留 30 天后过期。
- 匿名 UTC 日聚合只保留计数，不含 Journey/attempt ID，保留 90 天后过期。
- `src/lib/prompt/agent/raw-content-store.ts` 通过专用的服务端 raw 凭据边界承接所有原始诊断写入；存储隔离与 ACL 仍须由部署负责人配置并核验。Built-in fixed completion 会把包含 auto-fill 的完整回答历史送入 Journey completion 边界；服务端校验 canonical extension 并签发绑定最终 snapshot 的 Done token，之后 `/api/raw-content` 才从该签名 snapshot 在服务端重新生成最终提示词。provider 内容则在服务端 Journey 边界采集，不提供 raw 读取 API。UI 原始诊断同意明确且默认关闭；仅稳定服务端抽样的 20% 已同意 Journey 具备资格，重试沿用同一抽样。允许的 raw 内容包括 Subject brief、每项回答的 `questionId`/所选选项 ID/自由文本、服务端重算的最终中英文提示词，以及 provider 白名单内容：OpenAI 第一 choice 的 `finish_reason`、message text、`tool_calls[].function.name` 与原样 `arguments`；Anthropic 的 `stop_reason`、text blocks、`tool_use` name 与 input。每条 raw 记录还保留用于关联和过期的内部元数据：`version`、`journeyId`、`release`、`route`、`turn`、provider 记录的 `delivery`、`recordedAt`、`expiresAt`；这些不是 provider response ID。provider response ID（OpenAI 的 `id`/`tool_calls[].id`、Anthropic 的 `tool_use.id`）以及 model、usage、system_fingerprint、headers 等丢弃。浏览器 key、仓库、构建产物和 replay artifact 都不进入 raw 存储。

Raw capture 使用以下服务端变量，并且写入同时要求 `RAW_CONTENT_SAMPLING_ENABLED=1` 与 `RAW_CONTENT_RETENTION_VERIFIED=1`（另需 raw store 凭据）：

```text
RAW_CONTENT_REDIS_REST_URL
RAW_CONTENT_REDIS_REST_TOKEN
RAW_CONTENT_SAMPLING_ENABLED=1
RAW_CONTENT_RETENTION_VERIFIED=1
```

每个 raw-store key 都以绝对 `PXAT` 写入，最晚为 `recordedAt + 14 天`；这只约束 Redis key TTL，不证明 ACL、备份、日志或 provider/all-media retention。为保证首个响应丢失后的重试仍使用同一 Journey，初始 Journey ID 由客户端生成；服务端密钥 HMAC 阻止离线预测抽样结果，但攻击者仍可通过反复创建 Journey 影响样本分布，因此生产启用 raw 前还必须在 Vercel/WAF 限制新 Journey 创建速率。生产环境 raw 仍保持关闭/blocked；部署负责人必须分别核验这些访问、滥用防护与保留门槛，当前仓库没有把它们当作已证实事实，未核验前不得在生产设置 `RAW_CONTENT_RETENTION_VERIFIED=1`。

`npm run verify:retention-live` 是默认跳过、显式 opt-in 的现场检查，只能使用隔离的非生产 Redis。它要求专用的测试凭据和明确的隔离确认：

```text
RAW_RETENTION_TEST_ISOLATION_ACK=I_UNDERSTAND_ISOLATED_NON_PRODUCTION
RAW_RETENTION_TEST_RAW_REDIS_REST_URL
RAW_RETENTION_TEST_RAW_REDIS_REST_TOKEN
RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_URL
RAW_RETENTION_TEST_ATTEMPT_REDIS_REST_TOKEN
```

该检查只创建随机的短生命周期 probe key，并验证真实后端先可见、后删除；隔离确认或任一测试凭据缺失都会失败。它不读取生产 `RAW_CONTENT_REDIS_REST_*` 或 `UPSTASH_REDIS_REST_*` 凭据。本次实现没有运行该现场检查。Upstash 普通公开条款目前不能证明备份/日志/全媒体会在 14 天内删除；因此通过 TTL probe 也不能替代部署负责人的 ACL、备份、日志和 all-media retention 核验。本说明不声称当前 Vercel 部署已配置这些变量或已验证实时删除。

已知残留风险：`npm audit --omit=dev` 仍报告 Next 内嵌 PostCSS 的 2 个中等告警（当前无可用修复）。应用不编译用户提供的 CSS，因此不强制覆盖依赖树；待 Next 提供安全版本后正常升级。

## 命令

```bash
npm run dev
npm run verify   # typecheck + lint + test + build
npm run verify:retention-live  # 仅隔离非生产 Redis；需测试专用凭据与 isolation ack
npm run eval -- --provider deepseek --dry-run --max-runs 2  # 需 CIPG_EVAL_API_KEY
# 可与姊妹仓共用：source ../controllable-image-prompt-guide/.env.eval
npm run compare-corpus -- .research/out/eval/<run-dir> path/to/corpus.csv
npm run analyze-prompts -- path/to/prompts.txt              # Excel 先导出为 txt
npm test
npm run typecheck
npm run build
```

## 与主仓库的关系

| 仓库 | 内容 |
|------|------|
| **thoth**（本仓库） | 上线版：仅图片、规则路由 + AI 候选筛选向导 |
| **[controllable-image-prompt-guide](https://github.com/prompt-tools/controllable-image-prompt-guide)** | 开发 + 评测仓: agent eval 流水线（人像 seed 见 `.research/eval-seeds/portrait-seeds.txt`） |
| **[cipg-eval-test](https://github.com/prompt-tools/cipg-eval-test)** | 私有评测床: GitHub Actions + DeepSeek 定时 eval |

## 许可

MIT — 见 [LICENSE](./LICENSE)。
