<!--
Language switcher / 语言切换
-->

中文 | [English](./README.en.md)

---

# thoth · 可控图片提示词向导

> 面向非专业用户的**图片**提示词生成工具。只做选择题,把模糊需求转成可复制到通用图片模型里的专业提示词。
>
> **v0.1.0** — AI 自适应版,上线于 Vercel。欢迎反馈。

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

1. 用一句话说说你想要的图(也可以跳过)。
2. AI 根据你已有的选择,**动态决定下一题**和该题的候选选项——而不是一次性铺开所有选择题。
3. 你没回答的维度,AI 会据你已选的风格**自动补全**(可在结果里删改)。
4. 最终提示词由你选中的选项**确定性拼接**生成,不靠 AI 改写语义。输出中文 / 英文 prompt。

精细度两档:**简单**(只问几个核心问题)/ **专业**(问得更全,每题可展开全部选项)。

## 特点

- **零填空** — 全程选择题驱动
- **对用户免费** — 无需自带 key,模型额度由我们承担
- **零登录**
- **即时复制** — 中文 / 英文 prompt、JSON brief

## 图片维度

用途 · 主体 · 场景 · 构图 · 光线 · 画风 · 色调 · 氛围 · 视角 · 比例 · 细节 · 后期 · 约束 · 时间季节（选项在 `src/lib/prompt/options/image/` 持续扩充）

## 技术栈

Next.js 15 · TypeScript 5.7 · React 19 · Tailwind CSS v3 · Vitest 4。部署在 Vercel:`/api/llm` 服务端代理调用模型(内置 key),`/api/telemetry` 记录每步选择用于分析。

## 命令

```bash
npm run dev
npm run verify   # typecheck + lint + test + build
npm test
npm run typecheck
npm run build
```

## 与主仓库的关系

| 仓库 | 内容 |
|------|------|
| **thoth**（本仓库） | 上线版:仅图片、AI 自适应向导 |
| **[controllable-prompt-guide](https://github.com/prompt-tools/controllable-prompt-guide)** | 视频 + 图片,可切换工种(含评测/测试) |

## 许可

MIT — 见 [LICENSE](./LICENSE)。
