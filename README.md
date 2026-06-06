<!--
Language switcher / 语言切换
-->

中文 | [English](./README.en.md)

---

# 可控图片提示词向导

> 面向非专业用户的**图片**提示词生成工具。只做选择题，把模糊需求转成可复制到通用图片模型里的专业提示词。
>
> **v0.1.0 预览版** — 从主仓库拆出的图片专版。欢迎反馈。

## 立即使用

**[https://controllable-image-prompt-guide.vercel.app](https://controllable-image-prompt-guide.vercel.app)** — 浏览器直接打开即可。不用注册、不用安装。

本地开发：

```bash
git clone https://github.com/prompt-tools/controllable-image-prompt-guide.git
cd controllable-image-prompt-guide
npm install
npm run dev
```

## 与主仓库的关系

| 仓库 | 内容 |
|------|------|
| **[controllable-image-prompt-guide](https://github.com/prompt-tools/controllable-image-prompt-guide)**（本仓库） | 仅图片：`image_prompt` + 通用图片模型 |
| **[controllable-prompt-guide](https://github.com/prompt-tools/controllable-prompt-guide)** | 视频 + 图片，可切换工种 |

## 特点

- **零填空** — 选择题驱动
- **零费用** — 静态站，不调生成 API
- **零登录**
- **即时复制** — 中文 / 英文 prompt、JSON brief、Markdown

## 图片维度

用途 · 主体 · 场景 · 构图 · 光线 · 画风 · 色调 · 氛围 · 视角 · 比例 · 细节 · 后期 · 约束 · 时间季节（选项在 `src/lib/prompt/options/image/` 持续扩充）

## 命令

```bash
npm run dev
npm test
npm run typecheck
npm run build
```

## 许可

MIT — 见 [LICENSE](./LICENSE)。
