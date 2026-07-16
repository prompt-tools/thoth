# DeepSeek turn contract and runtime guardrails

Date checked: 2026-07-15 (Asia/Shanghai)
Scope: official DeepSeek API behavior relevant to one-call versus two-call adaptive-question routing
Source policy: DeepSeek first-party API documentation only for provider claims; current Thoth source is cited separately where useful
Status: implementation-ready decision for issue #8; not a production change

## Bottom line

### Inference from the documented provider contract

DeepSeek does not require two model calls to choose a question and its options. One Chat Completions request can force a named function and return all routing fields as that function's JSON arguments. The chosen baseline is therefore:

1. `deepseek-v4-flash`;
2. one forced function call containing the complete Ask/Done decision;
3. `thinking: { "type": "disabled" }`, `stream: false`, and `max_tokens: 512`;
4. one 30-second end-to-end deadline and no automatic retry in the baseline;
5. a server-built Eligible pool plus server-side JSON, schema, catalog, conflict, repeat, budget, and Completion validation;
6. a 65,536 UTF-8-byte ceiling for both serialized provider request and buffered provider response;
7. atomic rejection and a visibly marked deterministic fallback when the provider is unavailable or the decision is invalid.

Two calls remain only an issue-5 eval challenger: first choose the dimension, then choose wording/options. They add another provider round trip, generated response, validation boundary, and partial-failure state. Automatic prefix caching may reduce repeated-input cost, but it is best-effort and cannot remove the extra request or guarantee lower latency. DeepSeek publishes no evidence that splitting this particular decision improves quality.

Strict tool mode could strengthen the one-call wire contract, but it is Beta, requires the `/beta` base URL, cannot express every desired invariant, and still does not replace application validation. Start with the stable endpoint plus local validation; test strict mode separately before adopting it.

## 1. Current models and limits

### Documented facts

| Item | `deepseek-v4-flash` | `deepseek-v4-pro` |
| --- | ---: | ---: |
| Current API model ID | Yes | Yes |
| OpenAI-format base URL | `https://api.deepseek.com` | `https://api.deepseek.com` |
| Thinking mode | Supported; enabled by default | Supported; enabled by default |
| Context length | 1M tokens | 1M tokens |
| Maximum output | 384K tokens | 384K tokens |
| JSON Output | Supported | Supported |
| Tool Calls | Supported | Supported |
| Published concurrency limit per account | 2,500 | 500 |

Source: [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/) and [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

DeepSeek describes Flash as its faster, more economical model and says it performs on par with Pro on simple agent tasks. That is a first-party product claim, not evidence from Thoth's routing corpus. Source: [DeepSeek V4 Preview Release](https://api-docs.deepseek.com/news/news260424/).

`deepseek-chat` and `deepseek-reasoner` are legacy aliases for Flash non-thinking and thinking modes. They are scheduled to become inaccessible on 2026-07-24 at 15:59 UTC, nine days after this research date. A new contract should use `deepseek-v4-flash` or `deepseek-v4-pro` directly. Source: [Your First API Call](https://api-docs.deepseek.com/) and [DeepSeek V4 Preview Release](https://api-docs.deepseek.com/news/news260424/).

The request parameter `max_tokens` limits generated tokens, and input plus generated tokens must fit the model context. The current reference links to the pricing/model page for its value range, but it does not publish a default on either page. Set it explicitly rather than depending on an undocumented default. Source: [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

### Inference for this ticket

- Flash is the right baseline for a short routing decision; Pro is a benchmark escalation, not the default.
- The published 1M/384K ceilings are far above this turn's needs. They do not justify sending the full catalog or allowing a large output. Keeping only eligible dimensions/options in the request remains the simpler and safer contract.
- Thinking is enabled unless explicitly disabled. A mechanical routing benchmark must pin the toggle or its latency, output-token use, and behavior are not reproducible.

### Unknowns

- DeepSeek publishes no p50/p95 latency or time-to-first-token service target for either V4 API model.
- The official pages reviewed do not state the default `max_tokens` value.
- The 384K maximum is a capability ceiling, not evidence that very large structured tool calls are reliable.

## 2. Tool calls and one-call structured routing

### Documented facts

The API accepts up to 128 tools, currently only tools of type `function`. `tool_choice` can be `none`, `auto`, or `required`; supplying a named function choice forces that function. Function arguments are returned as a JSON-formatted string. Source: [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

Outside strict mode, DeepSeek explicitly warns that function arguments may be invalid JSON or may include parameters not defined by the schema. Applications must validate before using them. Source: [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

Strict tool mode:

- is Beta;
- requires `https://api.deepseek.com/beta`;
- requires `strict: true` on every function;
- is available in thinking and non-thinking modes;
- validates the submitted function schema and rejects unsupported schemas;
- documents support for `object`, `string`, `number`, `integer`, `boolean`, `array`, `enum`, and `anyOf`;
- requires every property of every object to be listed in `required` and every object to set `additionalProperties: false`;
- does **not** support `minItems` or `maxItems` for arrays, nor `minLength` or `maxLength` for strings.

Source: [Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/).

The API returns a `finish_reason`. Relevant values are `tool_calls`, `length`, `content_filter`, and `insufficient_system_resource`. A router must not treat every HTTP 200 as a valid decision. Source: [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

### Inference for the Ask/Done contract

A single forced function can carry the entire turn:

```json
{
  "done": false,
  "nextQuestionId": "scene",
  "questionText": "...",
  "helperText": "...",
  "optionIds": ["...", "...", "..."]
}
```

The provider can enforce that the function is called. On the stable endpoint it cannot guarantee that the arguments parse or obey the schema, so local validation is mandatory.

Even strict mode cannot enforce the product rule of 3–6 `optionIds`, because its documented JSON Schema subset does not support `minItems`/`maxItems`. The app must also enforce:

- Ask versus Done field semantics;
- eligible `nextQuestionId` membership;
- option ID membership in the chosen dimension;
- uniqueness and 3–6 count;
- no repeats/conflicts and turn-budget rules.

The pinned Completion shape uses `null` for question fields. Strict mode's documented type list does not include `null`, so that contract is not documented as Beta-compatible. This ticket preserves the already approved `done`/`null` shape on the stable endpoint and treats strict Beta as a separate experiment rather than changing the product contract for an unproven provider feature.

### One call versus two calls

| Consideration | One forced tool call | Two calls: dimension, then options |
| --- | --- | --- |
| Provider support | Directly supported | Directly supported as two independent requests |
| Network/model round trips | 1 | 2 |
| Cross-field coherence | One model output | Must carry first result into second request |
| Validation | Required | Required after both calls |
| Prefix-cache opportunity | Reused prefixes across turns | Possible on call 2 only if a persisted prefix fully matches |
| Published quality evidence for Thoth | None | None |

The defensible default is one call. Choose two only if the pinned adaptive-question eval shows a material quality gain large enough to justify its extra failure surface and latency.

## 3. JSON Output is a separate option

### Documented facts

`response_format: { "type": "json_object" }` guarantees valid JSON message content. DeepSeek also requires the prompt to instruct the model to produce JSON; its guide says to include the word `json` and an example. The API reference warns that omitting the instruction can produce whitespace until the token limit. Source: [JSON Output](https://api-docs.deepseek.com/guides/json_mode/) and [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

DeepSeek warns that JSON Output may occasionally return empty content and that too-small `max_tokens` can truncate the JSON. Source: [JSON Output](https://api-docs.deepseek.com/guides/json_mode/).

### Inference for this ticket

JSON Output guarantees JSON syntax, not the catalog and semantic invariants required by routing. A forced function is a better fit because it gives a named operation and a function schema. Do not combine JSON Output and tool calling unless a live compatibility test proves the exact request; the reviewed docs document each feature separately but do not state how the two interact in one request.

## 4. Thinking-mode implications

### Documented facts

Thinking mode is enabled by default. OpenAI-format callers toggle it with `thinking: { "type": "enabled" | "disabled" }`; OpenAI SDK callers pass that field through `extra_body`. Thinking output appears in `reasoning_content`. Source: [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/).

In thinking mode, `temperature`, `top_p`, `presence_penalty`, and `frequency_penalty` have no effect; passing them does not produce an error. Source: [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/).

Thinking mode supports tool calls. When a thinking-mode turn performs a tool call and the conversation continues, the full assistant `reasoning_content` must be returned in subsequent requests; otherwise the API returns HTTP 400. Source: [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/).

Usage reports `completion_tokens_details.reasoning_tokens` as a breakdown of completion use. Source: [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

### Inference for this ticket

- Disable thinking for the one-call baseline. The output is a small constrained decision, and disabling avoids an unneeded hidden reasoning path and the multi-request reasoning-state rule.
- If thinking is later benchmarked, do not claim deterministic sampling from `temperature: 0`; the provider says temperature has no effect in thinking mode.
- A two-call design implemented as a continuation of a thinking tool-call conversation must preserve `reasoning_content`. Two independent non-thinking calls avoid that incompatibility.

## 5. Prompt caching and cost

### Documented facts

DeepSeek Context Caching is enabled by default with no request change. It caches reusable prefixes. A later request hits only a complete prefix unit already persisted by the service; cache construction can take seconds. The service is best-effort, does not guarantee a hit, and usually clears unused entries within a few hours to a few days. Source: [Context Caching](https://api-docs.deepseek.com/guides/kv_cache/).

Responses expose `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens`; `prompt_tokens` is their sum. Source: [Context Caching](https://api-docs.deepseek.com/guides/kv_cache/) and [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

Current official USD prices per 1M tokens:

| Model | Input, cache hit | Input, cache miss | Output |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | $0.0028 | $0.14 | $0.28 |
| `deepseek-v4-pro` | $0.003625 | $0.435 | $0.87 |

Source: [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/). DeepSeek states that prices may change and recommends checking that page regularly.

The exact Flash cost formula for a request is:

```text
USD = (cache_hit_input_tokens * 0.0028
     + cache_miss_input_tokens * 0.14
     + completion_tokens * 0.28) / 1_000_000
```

The API supports an opaque `user_id` for content-safety, scheduling, and KV-cache isolation. It must match `[a-zA-Z0-9\-_]+`, be no longer than 512 characters, and must not contain private user information. Source: [Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/).

### Inference for this ticket

- Keep the stable system prompt and common catalog instructions at the beginning of each request. Put turn-specific history and eligible options later so repeated prefixes have the best chance to hit.
- Measure both cache fields per turn. Do not budget as though every repeated system prompt will hit.
- A two-call turn may make some second-call input cheap when its prefix matches, but output tokens and the second round trip remain. Caching is not a reason by itself to split the turn.
- If isolation is later tested, derive an opaque non-PII `user_id` on the server; it is optional provider metadata, not part of the minimum turn contract.

## 6. Timeouts, streaming, concurrency, and retries

### Documented facts

Non-streaming is the normal full-response path. With `stream: true`, the API sends SSE message deltas and terminates with `data: [DONE]`; `stream_options.include_usage` adds a final usage chunk. Source: [Your First API Call](https://api-docs.deepseek.com/) and [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/).

While a request waits, DeepSeek may send empty lines on non-streaming responses or `: keep-alive` SSE comments on streaming responses. Custom parsers must tolerate them. If inference has not started after 10 minutes, DeepSeek closes the connection. This is a queue/keep-alive behavior, not a latency SLA. Source: [Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/).

Concurrency is account-level across API keys: 2,500 for Flash and 500 for Pro. Exceeding it returns HTTP 429. `user_id` supplies isolation, but regular-account user IDs still share the account limit. Source: [Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/).

The documented error guidance is:

| Status | Meaning | Provider guidance |
| --- | --- | --- |
| 400 | Invalid format | Fix request |
| 401 | Authentication failure | Check key |
| 402 | Insufficient balance | Top up |
| 422 | Invalid parameters | Fix parameters |
| 429 | Rate limit | Pace requests; provider fallback is suggested |
| 500 | Server error | Retry after a brief wait |
| 503 | Overloaded | Retry after a brief wait |

Source: [Error Codes](https://api-docs.deepseek.com/quick_start/error_codes/).

### Inference for this ticket

- Keep non-streaming for a short forced tool call. Streaming adds SSE/tool-argument assembly complexity and does not make a decision usable before the complete arguments arrive.
- An application may enforce a much shorter UX deadline than DeepSeek's 10-minute pre-inference close. Treat that deadline as a controlled fallback event, not evidence of a malformed provider response.
- The v1 baseline does not retry automatically. If issue-5 evidence later adds one retry, restrict it to transient outcomes (`429`, `500`, `503`, network failure, or `insufficient_system_resource`) inside the same total deadline; never retry `400`, `401`, `402`, or `422` unchanged.
- A timed-out request may have reached the provider. The reviewed docs do not say whether client cancellation prevents inference or billing, so avoid unbounded or immediate duplicate retries.
- Log status, `finish_reason`, elapsed time, model, thinking mode, cache-hit/miss tokens, completion tokens, and fallback reason. These are the minimum facts needed to compare one-call and two-call contracts.

### Unknowns

- No API latency SLA or percentile distribution is published.
- No cancellation/billing semantics for a client-aborted request were found.
- The docs publish concurrency ceilings but no numeric RPM/TPM schedule for these models.
- No `Retry-After` behavior is documented on the reviewed error/rate-limit pages.

## 7. Resolved Thoth contract

### Trust boundary

The browser sends only the required Subject brief, answer history, and a configured provider choice or credential. It must not supply a manifest, Known facts, eligibility, candidate allowlists, messages, tools, model name, or Completion state for the server to trust.

The target flow is:

~~~text
browser Subject brief + history
  -> domain-aware server boundary
  -> canonical portrait manifest + Known facts + 10/7/4 budget + Eligible pool
  -> provider-neutral adapter
  -> one forced provider tool call
  -> server validation against the exact Eligible snapshot
  -> normalized Ask, Completion, fallback, or recoverable error
~~~

The server remains the trust boundary even for BYOK. Provider-specific serialization stays behind the adapter. Catalog IDs remain separate from prompt fragments, the UI retains an independent Free-text answer, and the final prompt renderer remains deterministic.

### Server-built model input

~~~ts
type DifferentiationPillar =
  | "characterSignature"
  | "narrativeBehavior"
  | "visualWorld"
  | "presentationPurpose";

interface AdaptiveTurnModelRequest {
  contractVersion: "adaptive-question-turn-v1";
  subjectBrief: string;
  history: Array<{
    questionId: string;
    selectedOptionIds: string[];
    freeText?: string;
  }>;
  knownFacts: Array<{
    dimension: string;
    value: string;
    source: "brief" | "history";
    specificity: "exact" | "broad";
    pillar: DifferentiationPillar;
    materiallyDifferentiating: boolean;
  }>;
  budget: {
    class: "sparse" | "partial" | "detailed";
    limit: 10 | 7 | 4;
    used: number;
    remaining: number;
  };
  eligibleDimensions: Array<{
    questionId: string;
    title: string;
    helper: string;
    pillar: DifferentiationPillar;
    mode: "single" | "multi";
    candidates: Array<{
      id: string;
      label: string;
      plain: string;
    }>;
  }>;
}
~~~

The server derives all fields after `subjectBrief` and `history`. Exact facts suppress their dimensions. Broad-fact policies, delivery constraints, conflicts, and scope rules prefilter `candidates` before serialization, so the model never receives a second allowed/forbidden source of truth. `subject`, answered dimensions, irrelevant dimensions, and dimensions with fewer than three safe candidates are not Eligible. The Subject brief is not an Adaptive turn.

### Provider-neutral call and DeepSeek baseline

The normalized call contains one system instruction, one user payload containing the object above, and exactly one tool named `decide_adaptive_turn`. Adapters map this normalized call to OpenAI-compatible or Anthropic wire formats. For DeepSeek, force the named tool with `tool_choice` and pin:

- stable `https://api.deepseek.com` endpoint, not `/beta`;
- `model: "deepseek-v4-flash"`;
- `thinking: { "type": "disabled" }`;
- `temperature: 0` and `top_p: 1`;
- `max_tokens: 512`;
- `stream: false`.

The tool parameters are:

~~~json
{
  "type": "object",
  "properties": {
    "done": { "type": "boolean" },
    "nextQuestionId": {
      "anyOf": [{ "type": "string" }, { "type": "null" }]
    },
    "questionText": {
      "anyOf": [{ "type": "string" }, { "type": "null" }]
    },
    "helperText": {
      "anyOf": [{ "type": "string" }, { "type": "null" }]
    },
    "optionIds": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": [
    "done",
    "nextQuestionId",
    "questionText",
    "helperText",
    "optionIds"
  ],
  "additionalProperties": false
}
~~~

The stable endpoint does not guarantee conformance to this schema. The schema guides generation; the server validator is authoritative. The contract deliberately preserves the approved nullable Completion shape. Strict Beta does not document `null` support and is not a dependency of v1.

### Model output

~~~ts
interface AdaptiveTurnDecision {
  done: boolean;
  nextQuestionId: string | null;
  questionText: string | null;
  helperText: string | null;
  optionIds: string[];
}
~~~

Ask:

~~~json
{
  "done": false,
  "nextQuestionId": "scene",
  "questionText": "这位雨夜特工身后的环境更偏追逐现场，还是电影海报式舞台？",
  "helperText": "背景会决定她的危险感来自真实事件还是视觉包装。",
  "optionIds": [
    "image_scene:urban_street",
    "image_scene:neon_cityscape",
    "image_scene:abstract_bg"
  ]
}
~~~

Completion:

~~~json
{
  "done": true,
  "nextQuestionId": null,
  "questionText": null,
  "helperText": null,
  "optionIds": []
}
~~~

For Ask, `questionText` and `helperText` are trimmed, nonblank, and at most 200 Unicode code points each. `optionIds` contains 3–6 unique raw IDs. For Completion, all nullable fields are `null` and `optionIds` is empty.

## 8. Server validation order

Validation is atomic and runs against one immutable server-built turn snapshot:

1. Require a nonblank Subject brief. Validate history length against the derived 10/7/4 limit, and validate every history dimension and selected ID against the canonical portrait manifest.
2. Build Known facts, material pillar coverage, budget, eligibility, conflict filters, and broad-fact candidate policies on the server. Reject the request before the provider call if the serialized provider body exceeds 65,536 UTF-8 bytes.
3. Preserve the untouched provider response and tool input for diagnostics and replay evidence.
4. Require a successful provider status and `finish_reason: "tool_calls"`. A 200 response with `length`, `content_filter`, or `insufficient_system_resource` is not a valid decision.
5. Require exactly one `decide_adaptive_turn` call and parse its arguments as exactly one JSON object.
6. Require all five fields, their exact types, and no additional fields.
7. Enforce Ask/Completion branch consistency and the 1–200-code-point text bounds.
8. For Ask, require the proposed turn to remain within budget; require `nextQuestionId` to belong to the exact Eligible snapshot and to be neither `subject` nor repeated, suppressed, delivery-incompatible, or conflicting; require 3–6 unique raw IDs, all belonging to the chosen dimension's prefiltered candidate allowlist.
9. For Completion, require material coverage in all four pillars, the current turn count to remain within budget, and no deterministic blocking dependency. The model supplies the semantic judgment that no remaining question is likely to materially change the image; issue 5 evaluates that judgment.
10. Only a decision that passes every check may reach the UI as `source: "model"`.

Never filter invalid raw IDs and call the remainder valid. Any raw catalog, cardinality, duplicate, branch, or semantic violation rejects the entire model decision. The UI must independently confirm that Ask renders the same question ID, the same 3–6 ordered candidate IDs, and a Free-text answer path.

## 9. Retry, fallback, and termination

The v1 baseline makes exactly one provider call per Adaptive turn and performs no automatic retry. A manual user retry remains available. This is the smallest policy compatible with a 30-second UX ceiling and avoids duplicating an upstream request whose cancellation or billing state is undocumented.

If later issue-5 evidence justifies automatic retry, allow at most one retry within the same 30-second end-to-end deadline and only for a network failure, `429`, `500`, `502`, `503`, or `insufficient_system_resource`. Never retry unchanged `400`, `401`, `402`, `413`, `422`, parse failures, schema failures, catalog violations, or semantic failures.

After any final provider or validation failure:

- reject the complete model decision; never salvage its question, wording, or IDs;
- return `source: "fallback"` with the original status and machine-readable reason;
- choose `ordered[0]` only from the server's current Eligible snapshot;
- use that dimension's canonical title/helper and the first 3–6 candidates from its already-prefiltered, conflict-free catalog order;
- keep the UI's independent Free-text answer;
- never expose the full dimension or catalog and never fabricate Completion.

If no safe fallback Ask exists, return a recoverable error. Deterministic Completion is legal only when the Eligible pool is empty, all four pillars have material coverage, and the budget predicate holds; label it `source: "remainingEmpty"`, not `model`. Provider failure, invalid output, and fallback remain failed live-model attempts in replay. Repeated fallback or reaching a numeric turn ceiling must not silently become Completion.

## 10. Runtime ceilings and observability

| Guardrail | v1 hard value |
| --- | ---: |
| Provider calls per Adaptive turn | 1 |
| Normalized prompt parts | 1 system + 1 user |
| Tools | 1 forced `decide_adaptive_turn` |
| Model | `deepseek-v4-flash` |
| Output budget | `max_tokens: 512` |
| Thinking / streaming | disabled / false |
| Serialized provider request | at most 65,536 UTF-8 bytes |
| Buffered provider response | at most 65,536 UTF-8 bytes |
| Total turn deadline | 30 seconds |
| Automatic retries | 0 |
| Session history | at most 10 answers; enforce derived 10/7/4 limit |
| Ask candidates | 3–6 unique allowlisted IDs |
| Ask text | 1–200 Unicode code points per field |

A local read-only measurement on 2026-07-15 found 28 portrait manifest dimensions, 337 options, and 43,957 UTF-8 bytes for the lean full manifest. That leaves only 21,579 bytes under the 64 KiB ceiling for the prompt, schema, history, Known facts, and envelope. Send only the server-filtered Eligible pool and do not duplicate the full manifest or candidate policies.

The current route checks `JSON.stringify(upstreamBody).length`, which counts JavaScript UTF-16 code units rather than UTF-8 bytes; a correct boundary uses encoded byte length. It also buffers an unbounded upstream response. Both request and response limits are implementation requirements of this decision.

Record, for every attempt:

- contract, system-prompt, catalog, and model versions;
- source and fallback/error reason;
- provider status, `finish_reason`, attempt count, and elapsed milliseconds;
- `prompt_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`, `completion_tokens`, and reasoning tokens when present;
- raw validation failures and normalized Ask/Completion fields.

Caching is best-effort. Put stable instructions first, record hit/miss tokens, and budget as a cache miss. A DeepSeek `user_id` is optional provider-adapter metadata only: if tested, derive an opaque non-PII value on the server. It is not authentication, caller identity, quota, or rate limiting.

## 11. Verified current-runtime gaps

These are local-source observations, not DeepSeek claims:

- `activeDimensions` and `ordered[0]` currently choose the question and Completion before the model; DeepSeek only narrows candidates for that one dimension.
- The current system prompt explicitly forbids model-selected dimensions and Completion, and the UI has no contextual `questionText`.
- The parser performs partial browser-side catalog filtering, not server-side turn-contract validation. It accepts 1, more than 6, or duplicate candidate IDs.
- Missing, invalid, or all-disallowed tool output expands to the full current dimension and can still be labeled `fallbackUsed: false` / `source: "ordered"`.
- The 30-second proxy timeout applies per attempt. The client retries every thrown HTTP/network failure up to three total attempts without status classification, so one turn can approach 90 seconds.
- The proxy does not validate messages, tool shape, tool choice, adaptive output, response size, eligibility, budget, or Completion.
- The controller can turn two consecutive fallbacks or the legacy 28-turn ceiling into Completion, contrary to the approved predicate.
- The UI currently permits a blank Subject brief. `use_case` is removed from interactive routing even when it is a valid upstream question, and legacy simple/standard/detailed limits do not implement the approved Sparse/Partial/Detailed 10/7/4 budgets.

Sources: [`src/lib/prompt/agent/client.ts`](../src/lib/prompt/agent/client.ts), [`src/lib/prompt/agent/active-dimensions.ts`](../src/lib/prompt/agent/active-dimensions.ts), [`src/lib/prompt/agent/system-prompt.ts`](../src/lib/prompt/agent/system-prompt.ts), [`src/components/prompt-guide/use-agent-guide-controller.ts`](../src/components/prompt-guide/use-agent-guide-controller.ts), and [`src/app/api/llm/route.ts`](../src/app/api/llm/route.ts).

## 12. Separate security and provider debt

The adaptive-turn implementation must scope the owner-funded demo key to the server-built adaptive request instead of accepting caller-controlled messages, tools, and tool choice. The following broader items are real but do not change the turn contract and should not be silently folded into issue 8:

- replace the proxy's public-host denylist/open relay with exact configured endpoint and provider-header allowlists;
- add deployment-layer rate limiting and spend controls for the owner-funded path;
- fix Anthropic BYOK `x-api-key` recognition;
- normalize provider errors instead of returning raw upstream bodies;
- decide whether BYOK credentials may remain in `localStorage`.

No deployment-side WAF configuration was verified in this repository. DeepSeek's account concurrency ceiling and optional `user_id` do not replace product rate limiting.

## 13. Issue-5 handoff

Issue 5 owns proof and rollout, not this decision. It must run all 21 fixtures five times, grade every attempted run including fallbacks and provider errors, and enforce the approved zero-violation, at least 95% `acceptableNext`, and at least 90% scored-pass gates. It also owns recorded-response replay, p50/p95 latency, actual cache/token/USD distributions, browser walkthroughs, and rollout go/no-go thresholds.

Implement and gate the one-call contract first. Build the two-call challenger only if the one-call path misses the quality gate or later evidence shows a material improvement worth two round trips. A deterministic-router result cannot substitute for raw model-selected question and Completion evidence.

## Official sources used

- [Your First API Call](https://api-docs.deepseek.com/)
- [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/)
- [Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)
- [JSON Output](https://api-docs.deepseek.com/guides/json_mode/)
- [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/)
- [Context Caching](https://api-docs.deepseek.com/guides/kv_cache/)
- [Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)
- [Error Codes](https://api-docs.deepseek.com/quick_start/error_codes/)
- [DeepSeek V4 Preview Release](https://api-docs.deepseek.com/news/news260424/)

## Explicitly unresolved

Issue 5 must measure real semantic quality, p50/p95 latency, timeout/fallback rate, cache behavior, token use, and USD cost. The reviewed provider documentation does not resolve cancellation billing, strict-Beta production stability, or whether 512 is the optimal output cap. Those unknowns do not block the v1 contract because it pins a bounded baseline and treats every fallback as a failed live-model attempt.
