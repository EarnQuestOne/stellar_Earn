import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_RETRY_POLICY,
  computeBackoffDelayMs,
  isIdempotentMethod,
  isRetryableStatus,
  parseRetryAfterMs,
  withRetryPolicy,
  type RetryPolicy,
} from './retry-policy';

/** Collects the delays requested instead of actually waiting. */
function recordingSleep() {
  const delays: number[] = [];
  const sleep = (ms: number) => {
    delays.push(ms);
    return Promise.resolve();
  };
  return { delays, sleep };
}

const NO_JITTER: RetryPolicy = { ...DEFAULT_RETRY_POLICY, jitter: false };

describe('isIdempotentMethod', () => {
  it('accepts replayable methods regardless of case', () => {
    expect(isIdempotentMethod('get')).toBe(true);
    expect(isIdempotentMethod('GET')).toBe(true);
    expect(isIdempotentMethod('Head')).toBe(true);
    expect(isIdempotentMethod('options')).toBe(true);
    expect(isIdempotentMethod('put')).toBe(true);
    expect(isIdempotentMethod('delete')).toBe(true);
  });

  it('rejects methods that would duplicate side effects', () => {
    expect(isIdempotentMethod('post')).toBe(false);
    expect(isIdempotentMethod('patch')).toBe(false);
  });

  it('rejects a missing method', () => {
    expect(isIdempotentMethod(undefined)).toBe(false);
    expect(isIdempotentMethod(null)).toBe(false);
    expect(isIdempotentMethod('')).toBe(false);
  });
});

describe('isRetryableStatus', () => {
  it('treats server errors as transient', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
  });

  it('excludes 501, which is a permanent capability gap', () => {
    expect(isRetryableStatus(501)).toBe(false);
  });

  it('treats timeout / rate-limit responses as transient', () => {
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(425)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
  });

  it('never retries ordinary client errors', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });
});

describe('parseRetryAfterMs', () => {
  it('parses the delta-seconds form', () => {
    expect(parseRetryAfterMs('120')).toBe(120_000);
    expect(parseRetryAfterMs('0')).toBe(0);
    expect(parseRetryAfterMs('  5  ')).toBe(5_000);
  });

  it('parses the HTTP-date form relative to now', () => {
    const now = Date.parse('2026-07-29T00:00:00.000Z');
    const later = 'Wed, 29 Jul 2026 00:00:30 GMT';
    expect(parseRetryAfterMs(later, now)).toBe(30_000);
  });

  it('clamps a past HTTP-date to zero rather than going negative', () => {
    const now = Date.parse('2026-07-29T00:01:00.000Z');
    const earlier = 'Wed, 29 Jul 2026 00:00:00 GMT';
    expect(parseRetryAfterMs(earlier, now)).toBe(0);
  });

  it('returns null for absent or unparseable values', () => {
    expect(parseRetryAfterMs(undefined)).toBeNull();
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs('')).toBeNull();
    expect(parseRetryAfterMs('soon')).toBeNull();
    expect(parseRetryAfterMs(120)).toBeNull();
  });
});

describe('computeBackoffDelayMs', () => {
  it('grows exponentially when jitter is disabled', () => {
    expect(computeBackoffDelayMs(0, NO_JITTER)).toBe(1_000);
    expect(computeBackoffDelayMs(1, NO_JITTER)).toBe(2_000);
    expect(computeBackoffDelayMs(2, NO_JITTER)).toBe(4_000);
  });

  it('never exceeds maxDelayMs', () => {
    expect(computeBackoffDelayMs(10, NO_JITTER)).toBe(NO_JITTER.maxDelayMs);
  });

  it('keeps half the delay deterministic under equal jitter', () => {
    expect(computeBackoffDelayMs(0, DEFAULT_RETRY_POLICY, () => 0)).toBe(500);
    expect(computeBackoffDelayMs(0, DEFAULT_RETRY_POLICY, () => 1)).toBe(1_000);
  });

  it('always returns a positive delay so retries make progress', () => {
    const delay = computeBackoffDelayMs(0, DEFAULT_RETRY_POLICY, () => 0);
    expect(delay).toBeGreaterThan(0);
  });
});

describe('withRetryPolicy', () => {
  const alwaysRetry = () => true;

  it('returns immediately on success without sleeping', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi.fn().mockResolvedValue('ok');

    await expect(
      withRetryPolicy(fn, { isRetryable: alwaysRetry, sleep })
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  it('retries a transient failure and then succeeds', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('recovered');

    await expect(
      withRetryPolicy(fn, {
        policy: NO_JITTER,
        isRetryable: alwaysRetry,
        sleep,
      })
    ).resolves.toBe('recovered');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([1_000]);
  });

  it('stops after maxRetries and rethrows the final error', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('always down'));

    await expect(
      withRetryPolicy(fn, {
        policy: NO_JITTER,
        isRetryable: alwaysRetry,
        sleep,
      })
    ).rejects.toThrow('always down');

    // initial attempt + 3 retries
    expect(fn).toHaveBeenCalledTimes(4);
    expect(delays).toEqual([1_000, 2_000, 4_000]);
  });

  it('does not retry an error classified as permanent', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('bad request'));

    await expect(
      withRetryPolicy(fn, { isRetryable: () => false, sleep })
    ).rejects.toThrow('bad request');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  it('prefers a server-supplied Retry-After hint over computed back-off', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValue('ok');

    await withRetryPolicy(fn, {
      policy: NO_JITTER,
      isRetryable: alwaysRetry,
      retryAfterMs: () => 2_500,
      sleep,
    });

    expect(delays).toEqual([2_500]);
  });

  it('caps an oversized Retry-After hint at maxDelayMs', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValue('ok');

    await withRetryPolicy(fn, {
      policy: NO_JITTER,
      isRetryable: alwaysRetry,
      retryAfterMs: () => 10 * 60 * 1_000,
      sleep,
    });

    expect(delays).toEqual([NO_JITTER.maxDelayMs]);
  });

  it('falls back to back-off when no Retry-After hint is present', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');

    await withRetryPolicy(fn, {
      policy: NO_JITTER,
      isRetryable: alwaysRetry,
      retryAfterMs: () => null,
      sleep,
    });

    expect(delays).toEqual([1_000]);
  });

  it('reports each retry through onRetry', async () => {
    const { sleep } = recordingSleep();
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');

    await withRetryPolicy(fn, {
      policy: NO_JITTER,
      isRetryable: alwaysRetry,
      sleep,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][0]).toMatchObject({
      attempt: 1,
      delayMs: 1_000,
    });
  });

  it('performs no retries when maxRetries is zero', async () => {
    const { delays, sleep } = recordingSleep();
    const fn = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      withRetryPolicy(fn, {
        policy: { ...NO_JITTER, maxRetries: 0 },
        isRetryable: alwaysRetry,
        sleep,
      })
    ).rejects.toThrow('boom');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });
});
