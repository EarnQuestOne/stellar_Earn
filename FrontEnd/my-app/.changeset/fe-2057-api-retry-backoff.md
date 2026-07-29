---
type: added
scope: lib/api
issue: 2057
---

# Exponential back-off retry for transient API failures

## Added

- **`lib/api/retry-policy.ts`** — new transport-agnostic retry module
  ([#2057](https://github.com/EarnQuestOne/stellar_Earn/issues/2057)).
  - `DEFAULT_RETRY_POLICY` — 3 retries, 1 s initial delay, 8 s cap, jitter on.
  - `computeBackoffDelayMs()` — exponential growth clamped by `maxDelayMs`,
    using equal jitter so half the delay stays deterministic (retries always
    make forward progress) and half is randomised (avoids a thundering herd).
  - `parseRetryAfterMs()` — understands both `Retry-After` forms
    (delta-seconds and HTTP-date); a past date clamps to `0` rather than
    producing a negative delay.
  - `isRetryableStatus()` — 5xx except 501, plus 408, 425 and 429.
  - `isIdempotentMethod()` — GET/HEAD/OPTIONS/PUT/DELETE.
  - `withRetryPolicy()` — bounded runner with injectable `sleep`/`random` for
    deterministic tests, an `onRetry` observability hook, and rethrow of the
    original error once retries are exhausted.

## Changed

- **`lib/api/client.ts` — `get()` now retries transient failures.**
  The module already exported a `withRetry()` helper, but no request path ever
  called it, so idempotent GETs performed zero retries in practice. `get()` is
  now wrapped in `withRetryPolicy`, honouring a server `Retry-After` header when
  one is present.
- **`isRetryableError()` now also treats 408 / 425 / 429 as transient.**
  Previously the check was `status >= 500 && status !== 501`, so rate-limited
  responses were never retried even though the backend documents sending a
  `Retry-After` header with them (see `BackEnd/RATE_LIMITING_STRATEGY.md`).

### Before / after

Request counts for a single `get('/quests')` call:

| Scenario | Before | After |
| -------- | ------ | ----- |
| Transient 503, recovers on 2nd try | 1 request, surfaced as an error | 2 requests, resolves successfully |
| 429 with `Retry-After: 2` | 1 request, surfaced as an error | 2 requests, second sent after 2 s |
| Persistent 500 | 1 request, error | 4 requests (1 + 3 retries), then the original error |
| 404 Not Found | 1 request, error | 1 request, error (unchanged — not transient) |
| POST / PATCH | no retry | no retry (unchanged — not idempotent) |

## Compatibility

No breaking type or model changes. `withRetry()` keeps its exact signature and
behaviour for existing callers; mutating verbs are untouched.
