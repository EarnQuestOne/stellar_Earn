/**
 * Outbound webhook constants: supported domain events, delivery tuning, and
 * metric names. All retry/backoff values are configurable via env vars with
 * sane defaults — nothing is a hardcoded magic number in the hot path.
 */

/** Domain events the platform can push to third-party consumers. */
export const OUTBOUND_WEBHOOK_EVENTS = [
  'quest.created',
  'quest.completed',
  'quest.updated',
  'quest.deleted',
  'submission.received',
  'submission.approved',
  'submission.rejected',
  'payout.processed',
  'payout.failed',
] as const;

export type OutboundWebhookEvent = (typeof OUTBOUND_WEBHOOK_EVENTS)[number];

export const OUTBOUND_WEBHOOK_DEFAULTS = {
  /** Default max delivery attempts before dead-lettering. */
  maxAttempts: 5,
  /** Base backoff delay in ms for the first retry. */
  initialBackoffMs: 1_000,
  /** Multiplier applied to the backoff on each retry. */
  backoffFactor: 2,
  /** Max jitter added to a backoff delay, in ms. */
  jitterMs: 500,
  /** HTTP request timeout budget for a delivery POST. */
  requestTimeoutBudget: 'medium',
} as const;

export const OUTBOUND_WEBHOOK_METRICS = {
  deliveriesTotal: 'outbound_webhook_deliveries_total',
  latencyMs: 'outbound_webhook_delivery_latency_ms',
  retriesTotal: 'outbound_webhook_retries_total',
  deadLetteredTotal: 'outbound_webhook_dead_lettered_total',
  enqueuedTotal: 'outbound_webhook_enqueued_total',
} as const;

/** Env vars (documented in README) used to tune delivery behavior. */
export function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
