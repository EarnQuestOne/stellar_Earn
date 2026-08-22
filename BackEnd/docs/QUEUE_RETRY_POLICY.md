# Queue Retry & Backoff Policy

> Closes GitHub Issue [#1128](https://github.com/EarnQuestOne/stellar_Earn/issues/1128)

## Overview

Every BullMQ job type in the StellarEarn backend now has an **explicit, configurable retry and backoff policy**. Policies are defined once in a single module and automatically applied whenever a job is enqueued or scheduled, making the queue layer predictable and easy to tune.

---

## Files Changed

| File | Change |
|---|---|
| `src/modules/jobs/job-retry-policy.ts` | **New** – policy map, types, and utility functions |
| `src/modules/jobs/jobs.constants.ts` | `DEFAULT_JOB_OPTIONS` is now derived from `DEFAULT_RETRY_POLICY` |
| `src/modules/jobs/jobs.service.ts` | `addJob()` accepts optional `jobType`; worker routes non-retryable errors to DLQ immediately |
| `src/modules/jobs/services/job-scheduler.service.ts` | `startSchedule()` and `triggerScheduleNow()` embed `__jobType` in job data and apply per-type policy options |
| `test/jobs/job-retry-policy.spec.ts` | **New** – unit tests for the policy module |
| `test/jobs/jobs-retry-backoff.spec.ts` | **New** – integration-style tests for option merging and DLQ routing |

---

## Policy Shape

Each entry in the policy map is a `JobRetryPolicy` object:

```ts
interface JobRetryPolicy {
  /** Total number of attempts (1 = no retry). */
  attempts: number;

  /** BullMQ backoff strategy. */
  backoff: {
    type: 'exponential' | 'fixed';
    /** Base delay in milliseconds. */
    delay: number;
  };

  /**
   * Error message substrings that bypass retries.
   * A job that throws a matching error is immediately moved to the DLQ.
   */
  nonRetryableErrors: string[];

  /** Max completed jobs to keep in Redis (number) or remove all (true). */
  removeOnComplete: number | boolean;

  /** Max failed jobs to keep in Redis (number) or remove all (true). */
  removeOnFail: number | boolean;
}
```

---

## Per-Job-Type Policies

### Payouts

High-value financial operations; most aggressive retry settings.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `payout:process` | 8 | exponential | 10 s | Missing fields, zero amount, invalid Stellar address |
| `payout:settle` | 6 | exponential | 15 s | Missing fields |

### Email

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `email:send` | 6 | exponential | 3 s | Missing fields, invalid address |
| `email:digest` | 4 | exponential | 5 s | Missing fields, invalid addresses |

### Data Export & Reports

Long-running jobs; slower backoff to avoid hammering the DB.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `data:export` | 3 | exponential | 30 s | Missing fields, invalid format |
| `report:generate` | 3 | exponential | 30 s | Missing fields |

### Cleanup & Maintenance

Low-priority maintenance; fixed delay to space out retries evenly.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `cleanup:expired-sessions` | 3 | fixed | 30 s | _(none)_ |
| `cleanup:old-logs` | 3 | fixed | 30 s | _(none)_ |
| `maintenance:database` | 2 | fixed | 60 s | _(none)_ |

### Webhooks

External HTTP calls; resilient to transient failures.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `webhook:deliver` | 7 | exponential | 3 s | Missing fields, invalid URL |
| `webhook:retry` | 5 | exponential | 5 s | Missing fields |

### Analytics

Non-critical; short fixed delay is fine.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `analytics:aggregate` | 3 | fixed | 10 s | _(none)_ |
| `metrics:collect` | 3 | fixed | 5 s | _(none)_ |

### Quests

Business-critical; moderate settings.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `quest:deadline-check` | 5 | exponential | 5 s | Quest not found |
| `quest:completion-verify` | 5 | exponential | 5 s | Missing required verification fields |
| `quest:state-reconcile` | 5 | exponential | 10 s | _(none)_ |

### Dependency Checks

Advisory only; minimal retry.

| Job Type | Attempts | Backoff | Base Delay | Non-Retryable Errors |
|---|---|---|---|---|
| `dependency:freshness-check` | 2 | fixed | 60 s | _(none)_ |

---

## Default Fallback

When `addJob()` is called without a `jobType`, `DEFAULT_RETRY_POLICY` is used:

```ts
const DEFAULT_RETRY_POLICY = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  nonRetryableErrors: [],
  removeOnComplete: 100,
  removeOnFail: 200,
};
```

`DEFAULT_JOB_OPTIONS` in `jobs.constants.ts` is derived from this policy via `policyToBullMQOptions()`, ensuring the two are always in sync.

---

## Backoff Delay Calculation

```
fixed:       delay_ms (constant regardless of attempt number)
exponential: delay_ms × 2^(attempt - 1)
```

Examples for a policy with `delay: 5000, type: 'exponential'`:

| Attempt | Delay |
|---|---|
| 1 | 5 s |
| 2 | 10 s |
| 3 | 20 s |
| 4 | 40 s |
| 5 | 80 s |

Use `calculateBackoffDelay(policy, attempt)` from `job-retry-policy.ts` for programmatic access.

---

## Non-Retryable Errors & Dead-Letter Queue

A job is **immediately forwarded to the `dead_letter` queue** (bypassing remaining retries) when:

1. Its error message contains any string from `nonRetryableErrors` for its job type, **or**
2. `attemptsMade` reaches the configured `attempts` limit.

The `JobsService` worker `failed` handler reads `job.data.__jobType` to look up the policy. The `job-scheduler.service.ts` automatically embeds `__jobType` in the job data for all scheduled and manually triggered jobs.

The dead-letter queue entry includes:

```json
{
  "failedJob": {
    "id": "<bullmq-job-id>",
    "name": "<queue-name>-dlq",
    "data": { "...original payload..." },
    "failedReason": "<error message>",
    "reason": "non-retryable error | attempts exhausted"
  }
}
```

---

## Usage

### Enqueueing a typed job

```ts
// With explicit job type — per-type policy is applied automatically
await jobsService.addJob(
  QUEUES.PAYOUTS,
  { payoutId: 'p-123', amount: 50, ... },
  {}, // extra BullMQ opts (optional, can override policy)
  JobType.PAYOUT_PROCESS,
);
```

### Overriding a policy for a single job

Caller-supplied options always win:

```ts
await jobsService.addJob(
  QUEUES.PAYOUTS,
  payload,
  { attempts: 1 }, // disable retries for this specific call
  JobType.PAYOUT_PROCESS,
);
```

### Reading a policy at runtime

```ts
import { getRetryPolicy, calculateBackoffDelay } from './job-retry-policy';

const policy = getRetryPolicy(JobType.WEBHOOK_DELIVER);
console.log(`Max attempts: ${policy.attempts}`);
console.log(`Delay after 3rd failure: ${calculateBackoffDelay(policy, 3)} ms`);
```

### Checking whether an error is non-retryable

```ts
import { isNonRetryableError } from './job-retry-policy';

if (isNonRetryableError(JobType.EMAIL_SEND, err.message)) {
  // send alert, log to dead-letter directly, etc.
}
```

---

## Adding / Changing a Policy

1. Open `src/modules/jobs/job-retry-policy.ts`.
2. Find the entry for the target `JobType` in `JOB_RETRY_POLICIES`.
3. Update `attempts`, `backoff`, `nonRetryableErrors`, `removeOnComplete`, or `removeOnFail`.
4. No other files need to change — `jobs.service.ts` and `job-scheduler.service.ts` pick up the new values automatically.
5. Update the table in this document to match.
6. Run `npm test -- --testPathPattern=job-retry-policy` to verify.

---

## Testing

```bash
# Unit tests for the policy module
npx jest test/jobs/job-retry-policy.spec.ts

# Integration-style tests for option merging and DLQ routing
npx jest test/jobs/jobs-retry-backoff.spec.ts

# All job-related tests
npx jest --testPathPattern=test/jobs
```

---

## Performance Considerations

- Policy lookup is an **O(1) object key read** — zero overhead per job.
- `policyToBullMQOptions()` creates a small plain object; it is called once per `addJob()` invocation and is not cached because the cost is negligible.
- `calculateBackoffDelay()` is only used for observability/logging; it is never on the critical path.

---

## Security

- Non-retryable error patterns contain only static, application-defined strings — they never include user input, preventing crafted error messages from bypassing the DLQ.
- The `__jobType` field embedded in job data is only used internally by the worker failure handler and is never surfaced to external consumers.
