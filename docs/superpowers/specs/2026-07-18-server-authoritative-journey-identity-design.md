# Server-Authoritative Journey Identity

Date: 2026-07-18
Status: Approved for implementation
Issue: #15

## Problem

The browser currently creates a UUID and sends it as `journeyId` on the first
Built-in Journey request. The server validates the UUID but then uses it
directly for routing, raw-content sampling, signed claims, telemetry, and
storage. That preserves identity when the first response is lost, but it does
not satisfy Issue #15's server-authoritative identity contract and it overloads
one field with two meanings: creation idempotency and authenticated identity.

The repair must keep first-response retry stability without adding a Redis
lookup, preserve already-issued signed Journey tokens, and remove the unsafe
request-boundary cast noted in the final #25 review.

## Goals

- The server creates the opaque Journey ID used by routing, sampling, claims,
  attempts, telemetry, raw records, and all continuation requests.
- Repeating the same initial request after losing its response produces the
  same Journey ID and raw-content sample while the secret and release remain
  unchanged. It also preserves the route while the effective routing-enabled
  and exposure configuration remains unchanged.
- Identity creation adds no network or storage round trip.
- Existing version-1 signed Journey tokens continue when the secret and release
  are unchanged. A release or secret rotation intentionally invalidates them,
  matching the existing contract.
- Old cached clients remain usable during an explicit compatibility window
  without being allowed to choose the authenticated Journey ID.
- Invalid creation/continuation field combinations fail before attempt-store or
  provider work.

## Non-goals

- Replaying the same provider response or making provider calls exactly once.
  Each actual retry remains a new provider attempt with a unique attempt ID.
- Preventing an anonymous caller from repeatedly creating new Journeys online.
  The secret prevents offline bucket prediction; Vercel/WAF rate limiting is
  still required for online abuse control.
- Changing signed Journey token version 1 or the continuation state machine.
- Refactoring unrelated Journey, raw-content, or controller responsibilities.

## Approaches considered

### 1. Versioned HMAC over complete creation semantics — selected

The browser supplies a UUID v4 request nonce. The server constructs a canonical
creation envelope from the release, normalized nonce, Subject brief, precision,
and consent choice, then derives the Journey ID with a domain-separated
HMAC-SHA256. The full 32-byte digest is encoded as canonical Base64URL.

This is deterministic, opaque, bounded linear time in the accepted request
size, and requires no external state. Including the complete creation semantics
prevents one reused nonce from correlating different subjects, precision levels,
or consent choices under one Journey ID.

### 2. HMAC over the nonce only — rejected

This is slightly smaller but allows the same nonce to identify different
creation semantics. That can make Journey-level telemetry deduplication and
diagnostic correlation collapse unrelated starts.

### 3. Redis idempotency mapping or response cache — rejected

Redis could map a nonce to a random server ID or replay a complete first
response. It would add latency, availability coupling, locking, expiry, and
possibly response-content retention. Issue #15 needs identity, cohort, and
sample stability, not exactly-once provider execution.

## Wire contract

### Creation request

A request without `journeyToken` is a creation request. It must have empty
history, must not request Completion, and must provide exactly one creation
nonce:

- New clients send `journeyRequestId`, a hyphenated UUID v4. Hex digits are
  accepted case-insensitively and normalized to lowercase before derivation;
  the new browser always emits lowercase.
- During the compatibility window, old clients may instead send a UUID v4 in
  `journeyId`. The server applies the same normalization and treats this only as
  a deprecated nonce alias, never as the authenticated Journey ID.
- Sending both fields, neither field, or a malformed UUID returns HTTP 400.
- `rawContentConsent` is accepted only on creation.

The server derives the Journey ID before cohort assignment, sampling, attempt
creation, or provider execution.

### Continuation request

A request with `journeyToken` is a continuation request. It must provide the
server-returned `journeyId` and must not provide `journeyRequestId` or
`rawContentConsent`. The existing token verification remains authoritative:
the request ID must equal the signed claim, the release must match, and the
submitted snapshot must be a legal state advancement.

The server does not impose the new Base64URL format on IDs read from valid
version-1 tokens. This preserves continuation for pre-change tokens that contain
UUID Journey IDs when their signed secret and release still match the active
configuration.

## Identity derivation

The server constructs this object in a fixed property order:

```json
{
  "version": 1,
  "release": "<release>",
  "requestId": "<lowercase UUID v4>",
  "subjectBrief": "<exact UTF-8 input>",
  "precision": "simple|standard|detailed",
  "rawContentConsent": false
}
```

It serializes the server-constructed object with `JSON.stringify` and computes:

```text
Base64URL(HMAC-SHA256(secret, "journey-id:v1:" + serializedEnvelope))
```

The full canonical output is 43 characters. The existing minimum 32-byte
server-secret check remains the runtime gate because runtime code cannot prove
entropy. `CLAUDE.md`, `README.md`, and `README.en.md` must require at least 32
cryptographically random bytes and require the secret to remain stable for the
30-minute active-token window and any lost-first-response retry window.

Changing the secret, release, nonce, Subject brief, precision, or consent choice
changes the derived ID. Identity and sample retry stability are intentionally
scoped to the exact creation semantics within one `(secret, release)` pair.
Before a token exists, route stability additionally requires the effective
routing-enabled and exposure configuration to remain unchanged. After a token
exists, its signed route remains sticky even when exposure changes.

## Browser state flow

The controller keeps two separate refs:

- `journeyRequestIdRef`: client UUID used only before the first accepted
  response and retained across a lost-response retry.
- `journeyIdRef`: empty during creation, then set only from
  `result.journey.id` and used with the latest token for all later operations.

On restart, the browser creates a fresh request nonce and clears the server ID
and token. After the first accepted response, it clears the nonce, stores the
server ID and token, and never reconstructs the ID locally. Telemetry, raw
completion, fixed auto-fill, and polish continue using the server ID and token.

## Server and compatibility flow

The Journey runtime will:

1. Decode validated fields into an explicit `JourneyInput` object, eliminating
   `raw as unknown as JourneyInput` while continuing to discard unrelated
   top-level claims.
2. Classify the request as creation or continuation from token presence.
3. Validate the allowed identity-field matrix before any side effect.
4. Map the compatibility-window legacy `journeyId` creation field to an internal request
   nonce only.
5. Call a pure `deriveJourneyId` helper in `journey-state.ts`.
6. Use only the derived ID for route assignment, sampling, signed claims,
   attempts, telemetry, and raw content.

The obsolete `newJourneyId` runtime dependency and route-level `randomUUID`
factory will be removed. The only browser randomness is the request nonce; the
only authenticated identity is the server-secret-derived ID.

The legacy alias is deliberately confined to the creation decoder and covered
by a focused compatibility test. This PR adds but does not silently expire the
alias. Its merge must create a follow-up removal item; removal is eligible only
after the new browser assets have been the production default for seven
continuous days, the 30-minute token window has elapsed, and no rollback to the
old assets is planned. No feature flag or permanent compatibility abstraction
will be added.

## Request-size boundary

The raw `/api/journey-turn` request body is limited to 65,536 bytes. A bounded
reader rejects a larger stream before JSON parsing, HMAC derivation,
attempt-store work, or provider execution with HTTP 413 and
`journey_request_too_large`. This is an inbound limit; the existing 64 KiB
provider-request and provider-response limits remain separate.

## Failure handling

The server returns `invalid_journey_state` with HTTP 400 before attempt-store or
provider calls when:

- a creation request has neither or both nonce fields;
- a nonce is not a hyphenated UUID v4 after case normalization;
- creation includes history or Completion;
- a continuation includes `journeyRequestId` or `rawContentConsent`;
- a continuation omits the server Journey ID or fails existing token/snapshot
  verification.

An inbound body over 65,536 bytes returns `journey_request_too_large` with HTTP
413 before JSON parsing, HMAC derivation, attempt-store work, or provider work.

Provider or attempt failures keep their existing semantics. Retrying a lost
first response repeats provider work under a new attempt ID but preserves
Journey identity and sample; it also preserves the route while the effective
routing configuration is unchanged.

## Performance and security

- Creation adds one bounded linear-time HMAC-SHA256 over an envelope derived
  from a request body capped at 65,536 bytes; it adds no I/O and no new
  dependency.
- The full HMAC output prevents offline identity or cohort prediction without
  the server secret.
- Domain separation keeps Journey identity derivation independent from token
  signatures and raw-content sampling.
- Incorporating creation semantics prevents nonce reuse from merging unrelated
  Journey telemetry.
- Online nonce grinding remains a deployment-layer rate-limiting concern and
  remains blocked from raw production activation until Vercel/WAF controls are
  verified.

## Verification

Focused tests must prove:

- the derived ID is canonical 43-character Base64URL and deterministic;
- secret, release, nonce, Subject brief, precision, and consent changes each
  produce a different ID;
- uppercase and lowercase spellings of the same valid UUID v4 normalize to the
  same ID;
- the server-returned ID differs from the browser nonce;
- repeating an exact creation request preserves ID and sample, and preserves
  route under unchanged effective routing configuration, while creating a
  distinct attempt for each provider execution;
- first-response loss reuses the browser nonce and then switches to the server
  ID after success;
- creation and continuation field matrices reject invalid combinations before
  store/provider work;
- the deprecated initial `journeyId` alias derives the same ID as the new field;
- a frozen pre-change version-1 wire token containing a UUID Journey ID can
  continue under its fixed secret, release, and time; the fixture must not be
  regenerated with the new token helper during the test;
- a body larger than 65,536 bytes returns HTTP 413 before JSON parsing,
  attempt-store work, or provider execution;
- restart creates a new nonce and clears authenticated state;
- fixed/adaptive cohort stickiness, raw sampling, telemetry, raw completion,
  auto-fill, and polish continue to use the signed server ID.

After focused tests, run typecheck, zero-warning lint, all tests, deterministic
Adaptive replay, and the production build. Because the replay runner rejects
dirty production paths, use this order:

1. Commit the production and test changes.
2. Read the new production hash with:

   ```bash
   node --import tsx -e 'import("./.research/scripts/eval-adaptive.mjs").then(async (m) => console.log((await m.currentMetadata()).productionHash))'
   ```

3. Replace only the corpus `productionHash` values with that exact hash and
   amend the fixed commit; do not rewrite recorded content.
4. Run the focused replay tests and the explicit replay command:

   ```bash
   npm test -- .research/scripts/eval-adaptive.test.mjs
   npm run eval:adaptive -- --mode replay --input .research/adaptive-question-recordings.jsonl --out /tmp/thoth-issue15-replay
   ```

5. Run `npm run verify` from the clean fixed commit.

## Release gate

The implementation is complete only after:

1. the fixed commit passes the full local verification suite;
2. a fresh read-only Standards reviewer examines the fixed commit against
   `origin/main` for correctness, security, performance, compatibility, code
   quality, and test gaps, and returns APPROVE with no blocking finding and
   file/line evidence;
3. a different fresh read-only Spec reviewer maps every Issue #15 and this
   design acceptance item to code/test evidence and returns APPROVE, while
   keeping deployment-only evidence separate;
4. any review finding is fixed, the commit changes, the complete local gate is
   rerun, and both approvals are repeated against the new hash;
5. the PR CI and Vercel checks pass;
6. the clean PR is squash-merged;
7. Issue #15 is closed only when its server-created identity acceptance
   criterion is true on `main`.

Issue #16 live-model/browser evidence begins only after this gate. Production
raw activation remains separately blocked by Issue #25 deployment evidence.
