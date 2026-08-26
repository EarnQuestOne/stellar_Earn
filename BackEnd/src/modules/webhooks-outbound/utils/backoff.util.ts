/**
 * Exponential backoff with jitter for outbound webhook retries (#2306).
 * Mirrors the shape of `modules/webhooks/utils/retry-backoff.ts` but tuned
 * for outbound deliveries (longer base, hour-capped).
 */

export interface BackoffOptions {
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
  jitterRatio: number;
}

/**
 * Delay before the next attempt for a delivery that has already failed
 * `attemptsMade` times. Attempt 1 → base, then ×factor, capped, ±jitter.
 */
export function outboundBackoffDelayMs(
  attemptsMade: number,
  options: BackoffOptions,
): number {
  const exponential = Math.min(
    options.baseDelayMs *
      Math.pow(options.factor, Math.max(0, attemptsMade - 1)),
    options.maxDelayMs,
  );
  const jitter = exponential * options.jitterRatio;
  return Math.round(exponential + (Math.random() * 2 - 1) * jitter);
}

/** True when the delivery has exhausted its retry budget. */
export function isDeadLetterCandidate(
  attemptsMade: number,
  maxAttempts: number,
): boolean {
  return attemptsMade >= maxAttempts;
}
