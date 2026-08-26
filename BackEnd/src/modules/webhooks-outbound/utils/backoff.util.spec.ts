import { outboundBackoffDelayMs, isDeadLetterCandidate } from './backoff.util';

describe('outbound backoff util', () => {
  const opts = {
    baseDelayMs: 5_000,
    factor: 2,
    maxDelayMs: 3_600_000,
    jitterRatio: 0.25,
  };

  it('grows exponentially with the attempt count', () => {
    const first = outboundBackoffDelayMs(1, opts);
    const second = outboundBackoffDelayMs(2, opts);
    const third = outboundBackoffDelayMs(3, opts);
    // ±25% jitter — assert on the band, not the exact value.
    expect(first).toBeGreaterThanOrEqual(3_750);
    expect(first).toBeLessThanOrEqual(6_250);
    expect(second).toBeGreaterThanOrEqual(7_500);
    expect(second).toBeLessThanOrEqual(12_500);
    expect(third).toBeGreaterThanOrEqual(15_000);
    expect(third).toBeLessThanOrEqual(25_000);
  });

  it('never exceeds the cap', () => {
    const capped = outboundBackoffDelayMs(30, opts);
    expect(capped).toBeLessThanOrEqual(opts.maxDelayMs * 1.25);
  });

  it('treats attempt 0 like attempt 1 (defensive)', () => {
    expect(outboundBackoffDelayMs(0, opts)).toBeGreaterThanOrEqual(3_750);
  });

  it('dead-letters exactly at the attempt budget', () => {
    expect(isDeadLetterCandidate(4, 5)).toBe(false);
    expect(isDeadLetterCandidate(5, 5)).toBe(true);
    expect(isDeadLetterCandidate(6, 5)).toBe(true);
  });
});
