/**
 * Unit tests for job-retry-policy.ts
 *
 * Covers:
 *  - DEFAULT_RETRY_POLICY shape
 *  - JOB_RETRY_POLICIES completeness (every JobType has an entry)
 *  - getRetryPolicy() – known types, unknown fallback
 *  - policyToBullMQOptions() – correct field mapping
 *  - isNonRetryableError() – matching & non-matching messages
 *  - calculateBackoffDelay() – fixed and exponential strategies
 */

import { JobType } from 'src/modules/jobs/job.types';
import {
  DEFAULT_RETRY_POLICY,
  JOB_RETRY_POLICIES,
  getRetryPolicy,
  policyToBullMQOptions,
  isNonRetryableError,
  calculateBackoffDelay,
  JobRetryPolicy,
} from 'src/modules/jobs/job-retry-policy';

// ─── DEFAULT_RETRY_POLICY ─────────────────────────────────────────────────────

describe('DEFAULT_RETRY_POLICY', () => {
  it('has a positive attempts count', () => {
    expect(DEFAULT_RETRY_POLICY.attempts).toBeGreaterThan(0);
  });

  it('has a valid backoff type', () => {
    expect(['exponential', 'fixed']).toContain(
      DEFAULT_RETRY_POLICY.backoff.type,
    );
  });

  it('has a positive backoff delay', () => {
    expect(DEFAULT_RETRY_POLICY.backoff.delay).toBeGreaterThan(0);
  });

  it('has an empty nonRetryableErrors list', () => {
    expect(DEFAULT_RETRY_POLICY.nonRetryableErrors).toEqual([]);
  });
});

// ─── JOB_RETRY_POLICIES completeness ─────────────────────────────────────────

describe('JOB_RETRY_POLICIES', () => {
  const allJobTypes = Object.values(JobType);

  it('has an entry for every JobType', () => {
    for (const type of allJobTypes) {
      expect(JOB_RETRY_POLICIES).toHaveProperty(type);
    }
  });

  it.each(allJobTypes)(
    'policy for %s has a positive attempts count',
    (type) => {
      expect(JOB_RETRY_POLICIES[type as JobType].attempts).toBeGreaterThan(0);
    },
  );

  it.each(allJobTypes)(
    'policy for %s has a valid backoff type',
    (type) => {
      expect(['exponential', 'fixed']).toContain(
        JOB_RETRY_POLICIES[type as JobType].backoff.type,
      );
    },
  );

  it.each(allJobTypes)(
    'policy for %s has a positive backoff delay',
    (type) => {
      expect(
        JOB_RETRY_POLICIES[type as JobType].backoff.delay,
      ).toBeGreaterThan(0);
    },
  );

  // Payout jobs should have more attempts than low-priority jobs
  it('PAYOUT_PROCESS has more attempts than METRICS_COLLECT', () => {
    expect(JOB_RETRY_POLICIES[JobType.PAYOUT_PROCESS].attempts).toBeGreaterThan(
      JOB_RETRY_POLICIES[JobType.METRICS_COLLECT].attempts,
    );
  });

  it('WEBHOOK_DELIVER attempts >= 5 (must be resilient to transient failures)', () => {
    expect(JOB_RETRY_POLICIES[JobType.WEBHOOK_DELIVER].attempts).toBeGreaterThanOrEqual(5);
  });
});

// ─── getRetryPolicy() ─────────────────────────────────────────────────────────

describe('getRetryPolicy()', () => {
  it('returns the correct policy for PAYOUT_PROCESS', () => {
    const policy = getRetryPolicy(JobType.PAYOUT_PROCESS);
    expect(policy).toBe(JOB_RETRY_POLICIES[JobType.PAYOUT_PROCESS]);
  });

  it('returns the correct policy for EMAIL_SEND', () => {
    const policy = getRetryPolicy(JobType.EMAIL_SEND);
    expect(policy).toBe(JOB_RETRY_POLICIES[JobType.EMAIL_SEND]);
  });

  it('returns the correct policy for WEBHOOK_DELIVER', () => {
    const policy = getRetryPolicy(JobType.WEBHOOK_DELIVER);
    expect(policy).toBe(JOB_RETRY_POLICIES[JobType.WEBHOOK_DELIVER]);
  });

  it('returns DEFAULT_RETRY_POLICY for an unknown type', () => {
    const policy = getRetryPolicy('unknown:type' as JobType);
    expect(policy).toBe(DEFAULT_RETRY_POLICY);
  });

  it('returns an immutable-like object (same reference on repeated calls)', () => {
    const a = getRetryPolicy(JobType.CLEANUP_OLD_LOGS);
    const b = getRetryPolicy(JobType.CLEANUP_OLD_LOGS);
    expect(a).toBe(b);
  });
});

// ─── policyToBullMQOptions() ──────────────────────────────────────────────────

describe('policyToBullMQOptions()', () => {
  const samplePolicy: JobRetryPolicy = {
    attempts: 7,
    backoff: { type: 'exponential', delay: 8_000 },
    nonRetryableErrors: ['some error'],
    removeOnComplete: 50,
    removeOnFail: 100,
  };

  it('includes attempts', () => {
    const opts = policyToBullMQOptions(samplePolicy);
    expect(opts.attempts).toBe(7);
  });

  it('includes backoff.type', () => {
    const opts = policyToBullMQOptions(samplePolicy);
    expect((opts.backoff as any).type).toBe('exponential');
  });

  it('includes backoff.delay', () => {
    const opts = policyToBullMQOptions(samplePolicy);
    expect((opts.backoff as any).delay).toBe(8_000);
  });

  it('includes removeOnComplete', () => {
    const opts = policyToBullMQOptions(samplePolicy);
    expect(opts.removeOnComplete).toBe(50);
  });

  it('includes removeOnFail', () => {
    const opts = policyToBullMQOptions(samplePolicy);
    expect(opts.removeOnFail).toBe(100);
  });

  it('does NOT include nonRetryableErrors (not a BullMQ option)', () => {
    const opts = policyToBullMQOptions(samplePolicy);
    expect(opts).not.toHaveProperty('nonRetryableErrors');
  });

  it('works with DEFAULT_RETRY_POLICY without throwing', () => {
    expect(() => policyToBullMQOptions(DEFAULT_RETRY_POLICY)).not.toThrow();
  });
});

// ─── isNonRetryableError() ────────────────────────────────────────────────────

describe('isNonRetryableError()', () => {
  describe('PAYOUT_PROCESS', () => {
    it('returns true for "Missing required payout fields"', () => {
      expect(
        isNonRetryableError(
          JobType.PAYOUT_PROCESS,
          'Missing required payout fields',
        ),
      ).toBe(true);
    });

    it('returns true for "Payout amount must be greater than zero"', () => {
      expect(
        isNonRetryableError(
          JobType.PAYOUT_PROCESS,
          'Payout amount must be greater than zero',
        ),
      ).toBe(true);
    });

    it('returns true for "Invalid Stellar recipient address"', () => {
      expect(
        isNonRetryableError(
          JobType.PAYOUT_PROCESS,
          'Invalid Stellar recipient address',
        ),
      ).toBe(true);
    });

    it('returns false for a transient network error', () => {
      expect(
        isNonRetryableError(
          JobType.PAYOUT_PROCESS,
          'Network timeout after 30s',
        ),
      ).toBe(false);
    });

    it('returns false for a generic database error', () => {
      expect(
        isNonRetryableError(
          JobType.PAYOUT_PROCESS,
          'ECONNREFUSED - DB unavailable',
        ),
      ).toBe(false);
    });
  });

  describe('EMAIL_SEND', () => {
    it('returns true for "Invalid email address"', () => {
      expect(
        isNonRetryableError(
          JobType.EMAIL_SEND,
          'Invalid email address: badformat',
        ),
      ).toBe(true);
    });

    it('returns true for "Missing required email fields"', () => {
      expect(
        isNonRetryableError(
          JobType.EMAIL_SEND,
          'Missing required email fields',
        ),
      ).toBe(true);
    });

    it('returns false for SMTP connection error', () => {
      expect(
        isNonRetryableError(JobType.EMAIL_SEND, 'SMTP connection refused'),
      ).toBe(false);
    });
  });

  describe('WEBHOOK_DELIVER', () => {
    it('returns true for "Invalid webhook URL"', () => {
      expect(
        isNonRetryableError(
          JobType.WEBHOOK_DELIVER,
          'Invalid webhook URL: ftp://bad',
        ),
      ).toBe(true);
    });

    it('returns false for a 503 transient error', () => {
      expect(
        isNonRetryableError(
          JobType.WEBHOOK_DELIVER,
          'Webhook endpoint returned 503 Service Unavailable',
        ),
      ).toBe(false);
    });
  });

  describe('ANALYTICS_AGGREGATE (no non-retryable errors)', () => {
    it('returns false for any error', () => {
      expect(
        isNonRetryableError(
          JobType.ANALYTICS_AGGREGATE,
          'Missing required fields',
        ),
      ).toBe(false);
    });
  });

  describe('unknown job type', () => {
    it('returns false (falls back to DEFAULT_RETRY_POLICY which has empty list)', () => {
      expect(
        isNonRetryableError('unknown:type' as JobType, 'any error'),
      ).toBe(false);
    });
  });

  describe('partial message matching', () => {
    it('returns true when the error is a substring match', () => {
      // "Invalid Stellar recipient address" is a non-retryable pattern
      // The error message here has extra context around it
      expect(
        isNonRetryableError(
          JobType.PAYOUT_PROCESS,
          'ValidationError: Invalid Stellar recipient address format detected',
        ),
      ).toBe(true);
    });
  });
});

// ─── calculateBackoffDelay() ──────────────────────────────────────────────────

describe('calculateBackoffDelay()', () => {
  const fixedPolicy: JobRetryPolicy = {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5_000 },
    nonRetryableErrors: [],
    removeOnComplete: 10,
    removeOnFail: 10,
  };

  const exponentialPolicy: JobRetryPolicy = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2_000 },
    nonRetryableErrors: [],
    removeOnComplete: 10,
    removeOnFail: 10,
  };

  describe('fixed backoff', () => {
    it('returns base delay for attempt 1', () => {
      expect(calculateBackoffDelay(fixedPolicy, 1)).toBe(5_000);
    });

    it('returns same base delay for attempt 2', () => {
      expect(calculateBackoffDelay(fixedPolicy, 2)).toBe(5_000);
    });

    it('returns same base delay for attempt 5', () => {
      expect(calculateBackoffDelay(fixedPolicy, 5)).toBe(5_000);
    });
  });

  describe('exponential backoff', () => {
    it('returns delay * 2^0 = delay for attempt 1', () => {
      expect(calculateBackoffDelay(exponentialPolicy, 1)).toBe(2_000); // 2000 * 1
    });

    it('returns delay * 2^1 for attempt 2', () => {
      expect(calculateBackoffDelay(exponentialPolicy, 2)).toBe(4_000); // 2000 * 2
    });

    it('returns delay * 2^2 for attempt 3', () => {
      expect(calculateBackoffDelay(exponentialPolicy, 3)).toBe(8_000); // 2000 * 4
    });

    it('returns delay * 2^3 for attempt 4', () => {
      expect(calculateBackoffDelay(exponentialPolicy, 4)).toBe(16_000); // 2000 * 8
    });

    it('grows monotonically', () => {
      const delays = [1, 2, 3, 4, 5].map((a) =>
        calculateBackoffDelay(exponentialPolicy, a),
      );
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }
    });
  });

  describe('edge cases', () => {
    it('returns 0 for attempt <= 0', () => {
      expect(calculateBackoffDelay(exponentialPolicy, 0)).toBe(0);
      expect(calculateBackoffDelay(exponentialPolicy, -1)).toBe(0);
    });

    it('matches real-world PAYOUT_PROCESS policy delays', () => {
      const policy = getRetryPolicy(JobType.PAYOUT_PROCESS); // delay=10000, exponential
      expect(calculateBackoffDelay(policy, 1)).toBe(10_000);
      expect(calculateBackoffDelay(policy, 2)).toBe(20_000);
      expect(calculateBackoffDelay(policy, 3)).toBe(40_000);
    });
  });
});
