# thoth — Bugbot review rules

Portrait-only image prompt wizard. Final prompts are **deterministically stitched** from catalog options; the LLM only picks questions/options and autofill picks.

## Must flag (blocking)

- **Secrets**: any API key, `.env` values, or `DEMO_DEEPSEEK_KEY` / `STEP_API_KEY` in client code or commits.
- **Browser exposure**: server-only env vars must not use `NEXT_PUBLIC_` or ship in client bundles (`/api/llm` proxy only).
- **Autofill session races**: async paths in `use-agent-guide-controller.ts` that `await` then `setState` without checking `sessionRef` (pattern: capture `mySession`, bail if `sessionRef.current !== mySession`).
- **Autofill / interactive drift**: `computeFillSet` must apply the same demotions as `activeDimensions` (`applyPropsQuestionDemotion`, `applyCameraQuestionDemotion`).
- **Silent autofill failure**: `autoFillDimensions` must not swallow errors without §7 core fallback when `lighting`/`hair`/`pose` are in `fillSet`.

## Portrait product invariants

- Do not suggest deleting or trimming `src/lib/prompt/options/image/*.options.ts` catalog content for "simplicity".
- `gradient.ts` tier/order semantics are data — flag logic changes, not file size.
- `renderPrompt` / `generic-image.renderer.ts` must not use LLM rewriting of user-selected meaning.
- `character_props` should only appear when seed has prop cues (`hasPropSeed`) in questionnaire or autofill paths.

## Prefer flagging (non-blocking)

- Duplicated autofill orchestration between controller and `eval-agent.mjs` (should share one helper).
- `routePrimaryType(description)` ignoring `description` — intentional portrait-only but call sites should stay consistent.
- `DebugLogPanel` rendered unconditionally in production (`agent-demo-client.tsx`).
- Eval harness `eval-report.mjs` metrics out of sync with `terminationReason` values from `eval-agent.mjs`.

## Tests

- Behavior changes under `src/lib/prompt/agent/` should include or update Vitest coverage in matching `*.test.ts`.
- Run gate: `npm run verify` (typecheck + lint + test + build).

## Out of scope for Bugbot

- Option label wording / i18n polish
- Eval latency benchmarks (StepFun vs DeepSeek)
- Langfuse telemetry schema unless PII is leaked
