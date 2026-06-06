<!--
Language switcher / 语言切换
-->

[中文](./README.md) | English

---

# thoth · Controllable Image Prompt Guide

> An **image-only** prompt wizard for non-expert users. Turn vague ideas into
> copy-ready prompts for generic image models through guided choices — no jargon,
> no API key of your own.
>
> **v0.1.0** — AI-adaptive build, live on Vercel. Feedback welcome.

## Try it

**[https://thoth-rho.vercel.app](https://thoth-rho.vercel.app)** — open in any
browser. No sign-up, no install, no key required.

Local:

```bash
git clone https://github.com/prompt-tools/thoth.git
cd thoth
npm install
npm run dev
```

## How it works

1. Describe the image in one line (or skip).
2. An AI agent **decides the next question** — and that question's candidate
   options — from what you've already chosen, instead of dumping every field at once.
3. Dimensions you skip are **auto-filled** to match your chosen style (editable in
   the result).
4. The final prompt is **deterministically stitched** from your selected options —
   no AI rewriting of meaning. Outputs Chinese + English prompts.

Two precision tiers: **Simple** (a few core questions) / **Pro** (asks more, with a
per-question "show all options" disclosure).

## Why

Most image tools expect stacked keywords and style jargon. This wizard breaks
dimensions into understandable choices.

- **Zero typing** — selection-based input
- **Free for users** — no key needed; model usage is owner-funded
- **Zero login**
- **Instant copy** — Chinese prompt, English prompt, JSON brief, Markdown

## Stack

Next.js 15 · TypeScript 5.7 · React 19 · Tailwind CSS v3 · Vitest 4. Deployed on
Vercel: `/api/llm` proxies the model server-side (built-in key); `/api/telemetry`
records each step for analysis.

## Scope (this repo)

| Item | Value |
|------|--------|
| Work type | `image_prompt` only |
| Target | `generic_image` only |
| Options | Under `src/lib/prompt/options/image/` |

For **video** (Seedance, Veo 3, etc.) and work-type switching, use the
[main repository](https://github.com/prompt-tools/controllable-prompt-guide).

## License

MIT — see [LICENSE](./LICENSE).
