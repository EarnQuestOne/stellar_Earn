/**
 * Constants for the outbound webhooks module (#2306).
 *
 * Deliveries run on the existing `webhooks` BullMQ queue declared in
 * `jobs.constants.ts` (it was declared in QUEUES / JOB_QUEUE_CONFIG but never
 * instantiated — this module is its first user). Queue jobs are single-attempt
 * by design: retry orchestration lives in the `webhook_deliveries` table
 * (attempt counter, backoff schedule, dead-letter flag), which keeps the
 * observable retry state in Postgres instead of inside Redis.
 */
import { QUEUES } from '../jobs/jobs.constants';

export const WEBHOOK_OUTBOUND_QUEUE = QUEUES.WEBHOOKS;

/** Deterministic BullMQ jobId per (delivery, attempt) — suppresses duplicate enqueues. */
export const outboundWebhookJobId = (
  deliveryId: string,
  attempt: number,
): string => `wh-out-${deliveryId}-a${attempt}`;

export const OUTBOUND_WEBHOOK_JOB_NAME = 'outbound-deliver';

/** Retry policy for outbound deliveries. */
export const WEBHOOK_OUTBOUND_RETRY = {
  /** Base delay for the first retry (ms). */
  baseDelayMs: 5_000,
  /** Multiplier applied per attempt. */
  factor: 2,
  /** Upper bound for a single backoff delay (ms). */
  maxDelayMs: 60 * 60 * 1_000,
  /** ± jitter ratio applied to the computed delay. */
  jitterRatio: 0.25,
  /** Default maximum delivery attempts before dead-lettering. */
  maxAttempts: 5,
  /** HTTP timeout for a single delivery attempt (ms). */
  requestTimeoutMs: 10_000,
  /** Rows stuck in `delivering` longer than this are reset by the scheduler. */
  stuckDeliveringMs: 10 * 60 * 1_000,
} as const;

/**
 * Domain events third parties may subscribe to. Kept as an explicit allowlist
 * (rather than "any emitted event") so internal machinery events
 * (`event.persisted`, `event.failed`, job bookkeeping, …) can never leak to
 * external consumers. `'*'` in a subscription's `eventTypes` means "all of the
 * catalog".
 */
export const WEBHOOK_OUTBOUND_EVENT_CATALOG = [
  'quest.created',
  'quest.completed',
  'submission.created',
  'submission.approved',
  'submission.rejected',
  'payout.processed',
  'payout.failed',
  'payout.dead_lettered',
  'user.reputation-changed',
  'user.level-up',
  'user.data-export.requested',
  'multisig.wallet.created',
  'multisig.signer.added',
  'multisig.signer.removed',
  'multisig.threshold.updated',
  'multisig.transaction.created',
  'multisig.transaction.approved',
  'multisig.transaction.approved_complete',
  // Synthetic event produced by the "send test event" endpoint.
  'test',
] as const;

export type OutboundWebhookEventType =
  (typeof WEBHOOK_OUTBOUND_EVENT_CATALOG)[number];

export const WEBHOOK_OUTBOUND_EVENT_CATALOG_SET: ReadonlySet<string> = new Set(
  WEBHOOK_OUTBOUND_EVENT_CATALOG,
);

/** Matches a subscription's event-type selection against an emitted event name. */
export const subscriptionMatchesEvent = (
  eventTypes: string[],
  eventName: string,
): boolean => eventTypes.includes('*') || eventTypes.includes(eventName);

/** Shared metric names (registration is idempotent in MetricsService). */
export const WEBHOOK_OUTBOUND_METRICS = {
  delivered: 'webhook_outbound_delivered_total',
  retryScheduled: 'webhook_outbound_retry_scheduled_total',
  deadLetter: 'webhook_outbound_dead_letter_total',
  skipped: 'webhook_outbound_skipped_total',
  dispatched: 'webhook_outbound_dispatched_total',
  duration: 'webhook_outbound_delivery_duration_ms',
} as const;
