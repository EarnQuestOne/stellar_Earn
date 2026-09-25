import { describe, it, expect } from 'vitest';
import { isRetryableError, getRetryAfterMs, GET_RETRY_POLICY } from './client';
import { createAppError, ERROR_CODES } from '@/lib/utils/error-handler';

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const SERVER = ERROR_CODES.SERVER_ERROR;

/**
 * The response interceptor runs `transformAxiosError` before any failure
 * reaches the retry layer, so the retry predicates almost never see a real
 * Axios error. These tests pin the transformed `AppError` shape specifically,
 * because classifying only on the Axios shape silently made every failed GET
 * retryable - including permanent 4xx responses.
 */
describe('isRetryableError - transformed AppError shapes', () => {
  const canRetry = (status: number, code: ErrorCode = SERVER) =>
    isRetryableError(createAppError('test failure', code, status));

  it('retries server errors', () => {
    expect(canRetry(500)).toBe(true);
    expect(canRetry(502)).toBe(true);
    expect(canRetry(503)).toBe(true);
  });

  it('does not retry 501, a permanent capability gap', () => {
    expect(canRetry(501)).toBe(false);
  });

  it('does not retry ordinary client errors', () => {
    expect(canRetry(400, ERROR_CODES.VALIDATION_ERROR)).toBe(false);
    expect(canRetry(401, ERROR_CODES.UNAUTHORIZED)).toBe(false);
    expect(canRetry(403, ERROR_CODES.FORBIDDEN)).toBe(false);
    expect(canRetry(404, ERROR_CODES.NOT_FOUND)).toBe(false);
  });

  it('retries timeout and rate-limit responses', () => {
    expect(canRetry(408)).toBe(true);
    expect(canRetry(425)).toBe(true);
    expect(canRetry(429)).toBe(true);
  });

  it('treats a response-less failure (statusCode 0) as transient', () => {
    expect(canRetry(0, ERROR_CODES.NETWORK_ERROR)).toBe(true);
    expect(canRetry(0, ERROR_CODES.TIMEOUT_ERROR)).toBe(true);
  });

  it('keeps unrecognised errors retryable for the withRetry helper', () => {
    // `withRetry` is used by useAPIBootstrap for non-HTTP operations, which
    // reject with plain Errors and have always been replayed.
    expect(isRetryableError(new Error('mystery'))).toBe(true);
  });
});

describe('getRetryAfterMs', () => {
  it('reads the hint preserved on the transformed error', () => {
    const error = createAppError('rate', SERVER, 429, { retryAfter: '2' });
    expect(getRetryAfterMs(error)).toBe(2_000);
  });

  it('returns null when the server sent no hint', () => {
    const error = createAppError('boom', SERVER, 500);
    expect(getRetryAfterMs(error)).toBeNull();
  });

  it('returns null for an unparseable hint', () => {
    const error = createAppError('rate', SERVER, 429, { retryAfter: 'soon' });
    expect(getRetryAfterMs(error)).toBeNull();
  });
});

/**
 * A user is waiting on a GET, so the total retry window has to stay short.
 * This also keeps request-level tests (which assert a 5xx propagates) inside
 * the default 5s test timeout rather than depending on it.
 */
describe('GET_RETRY_POLICY timing budget', () => {
  it('bounds the worst-case retry window well under 5 seconds', () => {
    const { maxRetries, initialDelayMs, maxDelayMs } = GET_RETRY_POLICY;
    let total = 0;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      total += Math.min(initialDelayMs * 2 ** attempt, maxDelayMs);
    }
    expect(total).toBeLessThan(2_000);
  });

  it('still allows three retries', () => {
    expect(GET_RETRY_POLICY.maxRetries).toBe(3);
  });
});
