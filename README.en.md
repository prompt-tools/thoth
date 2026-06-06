<!--
Language switcher / 语言切换
-->

[中文](./README.md) | English

---

# Controllable Image Prompt Guide

> An **image-only** prompt wizard for non-expert users. Turn vague ideas into copy-ready prompts for generic image models through guided choices — no jargon, no paid APIs.
>
> **v0.1.0 Preview** — forked from the main repo; image path only. Feedback welcome.

## Try it

**[https://controllable-image-prompt-guide.vercel.app](https://controllable-image-prompt-guide.vercel.app)** — open in any browser. No sign-up, no install.

Local:

```bash
git clone https://github.com/prompt-tools/controllable-image-prompt-guide.git
cd controllable-image-prompt-guide
npm install
npm run dev
```

## Why

Most image tools expect stacked keywords and style jargon. This wizard breaks dimensions into understandable choices and outputs bilingual prompts plus JSON brief and Markdown.

- **Zero typing** — selection-based input
- **Zero cost** — static site, no generation API
- **Zero login**
- **Instant copy** — Chinese prompt, English prompt, JSON brief, Markdown

## Scope (this repo)

| Item | Value |
|------|--------|
| Work type | `image_prompt` only |
| Target | `generic_image` only |
| Options | Under `src/lib/prompt/options/image/` |

For **video** (Seedance, Veo 3, etc.) and work-type switching, use the [main repository](https://github.com/prompt-tools/controllable-prompt-guide).

## License

MIT — see [LICENSE](./LICENSE).
