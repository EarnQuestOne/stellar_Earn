/**
 * Retry policy for transient API failures.
 *
 * This module is deliberately transport-agnostic: it knows nothing about Axios
 * so that it can be unit-tested in isolation and reused by any caller. The
 * predicate deciding whether a given error is transient is supplied by the
 * caller via `isRetryable`.
 *
 * Design notes:
 * - Retries are always bounded; the helper can never loop forever.
 * - Back-off grows exponentially but is clamped by `maxDelayMs`.
 * - Jitter is applied so that many clients failing at once do not all retry on
 *   the same tick (thundering herd).
 * - A server-supplied `Retry-After` hint takes precedence over the computed
 *   back-off, since the server knows better than we do.
 */

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  /** Maximum number of retries *after* the initial attempt. */
  maxRetries: number;
  /** Delay before the first retry, in milliseconds. */
  initialDelayMs: number;
  /** Upper bound applied to any single delay, in milliseconds. */
  maxDelayMs: number;
  /** When true, randomise part of the delay to de-synchronise clients. */
  jitter: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 1_000,
  maxDelayMs: 8_000,
  jitter: true,
};

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/**
 * HTTP methods that are safe to replay because repeating them has the same
 * effect as issuing them once.
 */
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options', 'put', 'delete']);

/** Returns true when replaying `method` cannot cause duplicate side effects. */
export function isIdempotentMethod(method?: string | null): boolean {
  if (!method) return false;
  return IDEMPOTENT_METHODS.has(method.toLowerCase());
}

/**
 * Status codes that represent a transient condition worth retrying.
 *
 * 501 (Not Implemented) is excluded because it is a permanent server-side
 * capability gap, not a blip.
 */
const TRANSIENT_STATUSES = new Set([
  408, // Request Timeout
  425, // Too Early
  429, // Too Many Requests
]);

export function isRetryableStatus(status: number): boolean {
  if (TRANSIENT_STATUSES.has(status)) return true;
  return status >= 500 && status !== 501;
}

// ---------------------------------------------------------------------------
// Delay calculation
// ---------------------------------------------------------------------------

/**
 * Parses an HTTP `Retry-After` header value into milliseconds.
 *
 * Supports both documented forms: delta-seconds (`"120"`) and an HTTP-date
 * (`"Wed, 21 Oct 2026 07:28:00 GMT"`). Returns null when the value is absent
 * or cannot be understood, so the caller can fall back to computed back-off.
 */
export function parseRetryAfterMs(
  value: unknown,
  now: number = Date.now()
): number | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1_000;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;

  // A date in the past means "retry immediately", not "retry in the past".
  return Math.max(0, parsed - now);
}

/**
 * Computes the back-off delay before a given zero-based retry attempt.
 *
 * Uses "equal jitter": half the delay is deterministic so retries always make
 * forward progress, and half is randomised to spread out concurrent clients.
 * `random` is injectable purely so tests can assert exact values.
 */
export function computeBackoffDelayMs(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random
): number {
  const exponential = policy.initialDelayMs * 2 ** Math.max(0, attempt);
  const capped = Math.min(exponential, policy.maxDelayMs);

  if (!policy.jitter) return capped;

  const half = capped / 2;
  return Math.round(half + random() * half);
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RetryAttemptInfo {
  /** One-based index of the retry about to be performed. */
  attempt: number;
  /** Delay that will elapse before the retry runs. */
  delayMs: number;
  /** The error that triggered the retry. */
  error: unknown;
}

export interface WithRetryPolicyOptions {
  policy?: RetryPolicy;
  /** Decides whether a thrown error is transient. */
  isRetryable: (error: unknown) => boolean;
  /** Optional extractor for a server-supplied `Retry-After` hint. */
  retryAfterMs?: (error: unknown) => number | null;
  /** Injectable for tests; defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests; defaults to Math.random. */
  random?: () => number;
  /** Observability hook fired immediately before each retry. */
  onRetry?: (info: RetryAttemptInfo) => void;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying transient failures with bounded, jittered back-off.
 *
 * The original error is rethrown once retries are exhausted or the error is
 * classified as permanent, so callers see the real failure rather than a
 * synthetic "retries exhausted" wrapper.
 */
export async function withRetryPolicy<T>(
  fn: () => Promise<T>,
  options: WithRetryPolicyOptions
): Promise<T> {
  const {
    policy = DEFAULT_RETRY_POLICY,
    isRetryable,
    retryAfterMs,
    sleep = defaultSleep,
    random = Math.random,
    onRetry,
  } = options;

  let attempt = 0;

  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= policy.maxRetries || !isRetryable(error)) {
        throw error;
      }

      const hinted = retryAfterMs ? retryAfterMs(error) : null;
      const delayMs =
        hinted !== null
          ? Math.min(hinted, policy.maxDelayMs)
          : computeBackoffDelayMs(attempt, policy, random);

      if (onRetry) {
        onRetry({ attempt: attempt + 1, delayMs, error });
      }

      await sleep(delayMs);
      attempt++;
    }
  }
}
