/**
 * Backoff policy for retrying failed webhook processing.
 *
 * Exponential backoff starting at 30s, doubling per attempt, capped at 30
 * minutes: 30s, 1m, 2m, 4m, 8m, 16m, capped at 30m thereafter.
 */
export const DEFAULT_WEBHOOK_MAX_ATTEMPTS = 5;

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;

/**
 * Computes the delay before a given retry attempt.
 *
 * @param attempt - The 1-based attempt number that just failed (1 = first
 *   failure/attempt). The returned delay is until the *next* attempt.
 */
export function computeWebhookBackoffDelayMs(attempt: number): number {
  if (attempt < 1) return 0;
  const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(delay, MAX_DELAY_MS);
}
