/**
 * Job Retry & Backoff Policy Configuration
 *
 * Defines configurable retry and backoff policies for each job type.
 * BullMQ uses these options when enqueuing and processing jobs.
 *
 * @see https://docs.bullmq.io/guide/retrying-failing-jobs
 */

import { JobType } from './job.types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** BullMQ-compatible backoff specification */
export interface BackoffOptions {
  /** 'exponential' | 'fixed' | 'custom' */
  type: 'exponential' | 'fixed';
  /** Base delay in milliseconds */
  delay: number;
}

/**
 * Per-job-type retry policy that maps directly to BullMQ JobsOptions fields.
 *
 * - `attempts`            – total attempts (1 = no retry)
 * - `backoff`             – delay strategy between attempts
 * - `nonRetryableErrors`  – error message substrings that should NOT be retried;
 *                           a job that throws one of these will be moved to the
 *                           dead-letter queue immediately.
 * - `removeOnComplete`    – how many completed jobs to retain in Redis
 * - `removeOnFail`        – how many failed jobs to retain in Redis
 */
export interface JobRetryPolicy {
  attempts: number;
  backoff: BackoffOptions;
  nonRetryableErrors: string[];
  removeOnComplete: number | boolean;
  removeOnFail: number | boolean;
}

// ─── Policy Definitions ───────────────────────────────────────────────────────

/**
 * Sensible global defaults used when a job type has no explicit policy.
 * Five attempts with exponential backoff starting at 5 s (≈ 5s, 10s, 20s, 40s).
 */
export const DEFAULT_RETRY_POLICY: Readonly<JobRetryPolicy> = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  nonRetryableErrors: [],
  removeOnComplete: 100,
  removeOnFail: 200,
};

/**
 * Per-job-type retry policies.
 *
 * Design rationale:
 *  - PAYOUT_*        : high-value; 8 attempts, slower backoff to avoid Stellar
 *                      network thrashing. Validation errors are never retried.
 *  - EMAIL_*         : external SMTP/SES; 6 attempts, moderate backoff.
 *                      Invalid-address errors surface immediately.
 *  - WEBHOOK_*       : remote HTTP; 7 attempts, exponential from 3 s.
 *                      Invalid-URL and 4xx errors are not retried.
 *  - ANALYTICS_*     : non-critical aggregation; 3 attempts, short fixed delay.
 *  - CLEANUP_*       : maintenance; 3 attempts, fixed 30 s. DB errors retry.
 *  - DATABASE_*      : low-concurrency maintenance; 2 attempts, fixed 60 s.
 *  - DATA_EXPORT /
 *    REPORT_GENERATE : long-running; 3 attempts, slow exponential.
 *  - QUEST_*         : business-critical; 5 attempts, moderate exponential.
 *  - DEPENDENCY_*    : advisory only; 2 attempts, fixed 1 min.
 */
export const JOB_RETRY_POLICIES: Readonly<
  Record<JobType, Readonly<JobRetryPolicy>>
> = {
  // ── Payouts ──────────────────────────────────────────────────────────────
  [JobType.PAYOUT_PROCESS]: {
    attempts: 8,
    backoff: { type: 'exponential', delay: 10_000 }, // 10 s → 20 s → 40 s …
    nonRetryableErrors: [
      'Missing required payout fields',
      'Payout amount must be greater than zero',
      'Invalid Stellar recipient address',
    ],
    removeOnComplete: 500,
    removeOnFail: 500,
  },
  [JobType.PAYOUT_SETTLE]: {
    attempts: 6,
    backoff: { type: 'exponential', delay: 15_000 },
    nonRetryableErrors: ['Missing required payout fields'],
    removeOnComplete: 500,
    removeOnFail: 500,
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  [JobType.EMAIL_SEND]: {
    attempts: 6,
    backoff: { type: 'exponential', delay: 3_000 },
    nonRetryableErrors: [
      'Missing required email fields',
      'Invalid email address',
    ],
    removeOnComplete: 200,
    removeOnFail: 200,
  },
  [JobType.EMAIL_DIGEST]: {
    attempts: 4,
    backoff: { type: 'exponential', delay: 5_000 },
    nonRetryableErrors: [
      'Missing required digest fields',
      'Invalid email addresses',
    ],
    removeOnComplete: 100,
    removeOnFail: 100,
  },

  // ── Data Export / Reports ─────────────────────────────────────────────────
  [JobType.DATA_EXPORT]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    nonRetryableErrors: [
      'Missing required export fields',
      'Invalid export format',
    ],
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  [JobType.REPORT_GENERATE]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    nonRetryableErrors: ['Missing required report fields'],
    removeOnComplete: 50,
    removeOnFail: 100,
  },

  // ── Cleanup / Maintenance ─────────────────────────────────────────────────
  [JobType.CLEANUP_EXPIRED_SESSIONS]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30_000 },
    nonRetryableErrors: [],
    removeOnComplete: 10,
    removeOnFail: 50,
  },
  [JobType.CLEANUP_OLD_LOGS]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30_000 },
    nonRetryableErrors: [],
    removeOnComplete: 10,
    removeOnFail: 50,
  },
  [JobType.DATABASE_MAINTENANCE]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 60_000 },
    nonRetryableErrors: [],
    removeOnComplete: 10,
    removeOnFail: 50,
  },

  // ── Webhooks ──────────────────────────────────────────────────────────────
  [JobType.WEBHOOK_DELIVER]: {
    attempts: 7,
    backoff: { type: 'exponential', delay: 3_000 },
    nonRetryableErrors: [
      'Missing required webhook fields',
      'Invalid webhook URL',
    ],
    removeOnComplete: 200,
    removeOnFail: 500,
  },
  [JobType.WEBHOOK_RETRY]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    nonRetryableErrors: ['Missing required retry fields'],
    removeOnComplete: 100,
    removeOnFail: 200,
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  [JobType.ANALYTICS_AGGREGATE]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10_000 },
    nonRetryableErrors: [],
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  [JobType.METRICS_COLLECT]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5_000 },
    nonRetryableErrors: [],
    removeOnComplete: 50,
    removeOnFail: 100,
  },

  // ── Quests ────────────────────────────────────────────────────────────────
  [JobType.QUEST_DEADLINE_CHECK]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    nonRetryableErrors: ['Quest not found'],
    removeOnComplete: 100,
    removeOnFail: 200,
  },
  [JobType.QUEST_COMPLETION_VERIFY]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    nonRetryableErrors: ['Missing required verification fields'],
    removeOnComplete: 200,
    removeOnFail: 200,
  },
  [JobType.QUEST_STATE_RECONCILE]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10_000 },
    nonRetryableErrors: [],
    removeOnComplete: 50,
    removeOnFail: 100,
  },

  // ── Dependency Checks ─────────────────────────────────────────────────────
  [JobType.DEPENDENCY_FRESHNESS_CHECK]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 60_000 },
    nonRetryableErrors: [],
    removeOnComplete: 10,
    removeOnFail: 20,
  },
};

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Returns the retry policy for a given job type.
 * Falls back to `DEFAULT_RETRY_POLICY` if the type is unknown.
 */
export function getRetryPolicy(jobType: JobType): Readonly<JobRetryPolicy> {
  return JOB_RETRY_POLICIES[jobType] ?? DEFAULT_RETRY_POLICY;
}

/**
 * Converts a `JobRetryPolicy` to the subset of BullMQ `JobsOptions` that
 * control retry / backoff behaviour, suitable for spreading into `queue.add()`.
 */
export function policyToBullMQOptions(
  policy: Readonly<JobRetryPolicy>,
): Record<string, unknown> {
  return {
    attempts: policy.attempts,
    backoff: {
      type: policy.backoff.type,
      delay: policy.backoff.delay,
    },
    removeOnComplete: policy.removeOnComplete,
    removeOnFail: policy.removeOnFail,
  };
}

/**
 * Checks whether an error should bypass retry logic and go straight to the
 * dead-letter queue.
 *
 * @param jobType  - The job type whose policy should be consulted
 * @param errorMsg - The error message to check
 * @returns `true` when the job must NOT be retried
 */
export function isNonRetryableError(
  jobType: JobType,
  errorMsg: string,
): boolean {
  const policy = getRetryPolicy(jobType);
  if (policy.nonRetryableErrors.length === 0) return false;
  return policy.nonRetryableErrors.some((pattern) =>
    errorMsg.includes(pattern),
  );
}

/**
 * Calculates the theoretical delay (in ms) for a given attempt number using
 * the policy's backoff strategy. Useful for logging / observability.
 *
 * @param policy  - The retry policy
 * @param attempt - The 1-based attempt number (1 = first retry)
 */
export function calculateBackoffDelay(
  policy: Readonly<JobRetryPolicy>,
  attempt: number,
): number {
  if (attempt < 1) return 0;
  if (policy.backoff.type === 'fixed') {
    return policy.backoff.delay;
  }
  // exponential: delay * 2^(attempt - 1)
  return policy.backoff.delay * Math.pow(2, attempt - 1);
}
