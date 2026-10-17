import {
  resolveWorkerConcurrency,
  resolveWorkerLimiter,
  workerConcurrencyEnvKeys,
  workerLimiterMaxEnvKeys,
  workerLimiterDurationEnvKeys,
  DEFAULT_WORKER_CONCURRENCY,
  MIN_WORKER_CONCURRENCY,
  MAX_WORKER_CONCURRENCY,
} from '../worker-concurrency.util';

describe('worker-concurrency.util', () => {
  describe('workerConcurrencyEnvKeys', () => {
    it('returns PAYOUT_QUEUE_CONCURRENCY and QUEUE_PAYOUTS_CONCURRENCY for payouts queue', () => {
      const keys = workerConcurrencyEnvKeys('payouts');
      expect(keys).toEqual([
        'PAYOUT_QUEUE_CONCURRENCY',
        'QUEUE_PAYOUTS_CONCURRENCY',
      ]);
    });

    it('returns QUEUE_NOTIFICATIONS_CONCURRENCY for generic queue', () => {
      const keys = workerConcurrencyEnvKeys('notifications');
      expect(keys).toEqual(['QUEUE_NOTIFICATIONS_CONCURRENCY']);
    });

    it('returns env keys for limiter max and duration', () => {
      expect(workerLimiterMaxEnvKeys('payouts')).toEqual([
        'PAYOUT_QUEUE_MAX_JOBS',
        'QUEUE_PAYOUTS_MAX_JOBS',
      ]);
      expect(workerLimiterDurationEnvKeys('payouts')).toEqual([
        'PAYOUT_QUEUE_DURATION_MS',
        'QUEUE_PAYOUTS_DURATION_MS',
      ]);
    });
  });

  describe('resolveWorkerConcurrency', () => {
    it('uses configured default for payouts when no env var set', () => {
      const result = resolveWorkerConcurrency('payouts', {});
      expect(result).toBe(10);
    });

    it('falls back to DEFAULT_WORKER_CONCURRENCY for unconfigured queue', () => {
      const result = resolveWorkerConcurrency('unknown_queue', {});
      expect(result).toBe(DEFAULT_WORKER_CONCURRENCY);
    });

    it('prefers PAYOUT_QUEUE_CONCURRENCY env override', () => {
      const result = resolveWorkerConcurrency('payouts', {
        PAYOUT_QUEUE_CONCURRENCY: '15',
      });
      expect(result).toBe(15);
    });

    it('clamps values to MIN_WORKER_CONCURRENCY', () => {
      const result = resolveWorkerConcurrency('payouts', {
        PAYOUT_QUEUE_CONCURRENCY: '1',
      });
      expect(result).toBe(MIN_WORKER_CONCURRENCY);
    });

    it('clamps values exceeding MAX_WORKER_CONCURRENCY', () => {
      const result = resolveWorkerConcurrency('payouts', {
        PAYOUT_QUEUE_CONCURRENCY: '500',
      });
      expect(result).toBe(MAX_WORKER_CONCURRENCY);
    });

    it('falls back when override is invalid', () => {
      const result = resolveWorkerConcurrency('payouts', {
        PAYOUT_QUEUE_CONCURRENCY: 'invalid',
      });
      expect(result).toBe(10);
    });
  });

  describe('resolveWorkerLimiter', () => {
    it('returns default limiter for payouts queue', () => {
      const limiter = resolveWorkerLimiter('payouts', {});
      expect(limiter).toEqual({ max: 25, duration: 1000 });
    });

    it('returns undefined for queue without default or env limiter', () => {
      const limiter = resolveWorkerLimiter('analytics', {});
      expect(limiter).toBeUndefined();
    });

    it('allows env override via PAYOUT_QUEUE_MAX_JOBS and PAYOUT_QUEUE_DURATION_MS', () => {
      const limiter = resolveWorkerLimiter('payouts', {
        PAYOUT_QUEUE_MAX_JOBS: '50',
        PAYOUT_QUEUE_DURATION_MS: '2000',
      });
      expect(limiter).toEqual({ max: 50, duration: 2000 });
    });
  });
});
