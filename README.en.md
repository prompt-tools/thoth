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

## Dimensions

**14 universal dimensions:** use case · subject · scene · composition · lighting · art style · color · mood · perspective · aspect ratio · detail · post-processing · constraints · time/season

**Subject-specific dimensions (unlocked when a matching subject is selected):**
- Pet/animal — breed, coat, pose, expression, gaze, count
- Architecture — style, type, material, viewpoint
- Portrait — expression, pose, outfit, hair
- Food — food state, tableware & plating

32 dimensions · 446 options in total.

## Related

| Repo | Purpose |
|------|---------|
| **thoth** (this repo) | Production app on Vercel |
| **[controllable-image-prompt-guide](https://github.com/prompt-tools/controllable-image-prompt-guide)** | Dev + eval repo: feature branches and SCSI evaluation pipeline |

## License

MIT — see [LICENSE](./LICENSE).
