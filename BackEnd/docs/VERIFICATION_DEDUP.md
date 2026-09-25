# Verification Deduplication

Duplicate proof-verification requests for the same submission can trigger redundant on-chain `approve_submission` calls. The `VerificationDedupService` prevents this with two layers.

## In-Flight Dedup

When `SubmissionsService.approveSubmission` is called, it delegates through `VerificationDedupService.executeWithDedup(key, operation)`. If a verification for the same submission ID is already in flight, the concurrent request awaits the same promise instead of starting a new operation.

**Key**: `approve:<submissionId>`

## Result Cache

After a successful verification, the result is cached for 5 seconds (configurable via `ttlMs`). Subsequent requests for the same submission return the cached result without re-executing DB lookups, validations, CAS updates, or the on-chain call.

Failures are **never** cached so legitimate retries (e.g., after a chain rollback) always re-execute.

## Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `submission_approval_dedup_hits_total` | counter | In-flight promise reused |
| `submission_approval_cache_hits_total` | counter | Cached result returned |

## Files

- `src/common/services/verification-dedup.service.ts` — service implementation
- `src/modules/submissions/submissions.service.ts` — integration point
