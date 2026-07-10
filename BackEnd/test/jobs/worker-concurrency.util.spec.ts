import {
  resolveWorkerConcurrency,
  workerConcurrencyEnvKey,
  MIN_WORKER_CONCURRENCY,
  MAX_WORKER_CONCURRENCY,
  DEFAULT_WORKER_CONCURRENCY,
} from '#src/modules/jobs/utils/worker-concurrency.util';
import { JOB_QUEUE_CONFIG, QUEUES } from '#src/modules/jobs/jobs.constants';

describe('worker concurrency tuning', () => {
  describe('workerConcurrencyEnvKey', () => {
    it('builds an upper-cased QUEUE_<NAME>_CONCURRENCY key', () => {
      expect(workerConcurrencyEnvKey('payouts')).toBe('QUEUE_PAYOUTS_CONCURRENCY');
      expect(workerConcurrencyEnvKey(QUEUES.MAINTENANCE)).toBe(
        'QUEUE_MAINTENANCE_CONCURRENCY',
      );
    });
  });

  describe('resolveWorkerConcurrency', () => {
    it('returns the benchmark-tuned default from JOB_QUEUE_CONFIG when no override is set', () => {
      expect(resolveWorkerConcurrency(QUEUES.PAYOUTS, {})).toBe(
        JOB_QUEUE_CONFIG[QUEUES.PAYOUTS].concurrency,
      );
      expect(resolveWorkerConcurrency(QUEUES.MAINTENANCE, {})).toBe(
        JOB_QUEUE_CONFIG[QUEUES.MAINTENANCE].concurrency,
      );
    });

    it('falls back to DEFAULT_WORKER_CONCURRENCY for a queue with no configured value', () => {
      expect(resolveWorkerConcurrency('unconfigured-queue', {})).toBe(
        DEFAULT_WORKER_CONCURRENCY,
      );
    });

    it('lets an environment override take precedence over the configured default', () => {
      const env = { QUEUE_PAYOUTS_CONCURRENCY: '42' };
      expect(resolveWorkerConcurrency(QUEUES.PAYOUTS, env)).toBe(42);
    });

    it('clamps an override above the maximum down to MAX_WORKER_CONCURRENCY', () => {
      const env = { QUEUE_EMAIL_CONCURRENCY: '10000' };
      expect(resolveWorkerConcurrency(QUEUES.EMAIL, env)).toBe(MAX_WORKER_CONCURRENCY);
    });

    it('rejects an override below the minimum and uses the configured default', () => {
      const env = { QUEUE_PAYOUTS_CONCURRENCY: '0' };
      expect(resolveWorkerConcurrency(QUEUES.PAYOUTS, env)).toBe(
        JOB_QUEUE_CONFIG[QUEUES.PAYOUTS].concurrency,
      );
    });

    it('rejects a negative override and uses the configured default', () => {
      const env = { QUEUE_PAYOUTS_CONCURRENCY: '-5' };
      expect(resolveWorkerConcurrency(QUEUES.PAYOUTS, env)).toBe(
        JOB_QUEUE_CONFIG[QUEUES.PAYOUTS].concurrency,
      );
    });

    it.each(['abc', '5.5', '  ', ''])(
      'ignores the non-integer override %p and uses the configured default',
      (value) => {
        const env = { QUEUE_PAYOUTS_CONCURRENCY: value };
        expect(resolveWorkerConcurrency(QUEUES.PAYOUTS, env)).toBe(
          JOB_QUEUE_CONFIG[QUEUES.PAYOUTS].concurrency,
        );
      },
    );

    it('always returns an integer within the supported bounds', () => {
      for (const queue of Object.values(QUEUES)) {
        const value = resolveWorkerConcurrency(queue, {});
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(MIN_WORKER_CONCURRENCY);
        expect(value).toBeLessThanOrEqual(MAX_WORKER_CONCURRENCY);
      }
    });

    it('reads from process.env by default', () => {
      const key = workerConcurrencyEnvKey(QUEUES.WEBHOOKS);
      const previous = process.env[key];
      process.env[key] = '7';
      try {
        expect(resolveWorkerConcurrency(QUEUES.WEBHOOKS)).toBe(7);
      } finally {
        if (previous === undefined) delete process.env[key];
        else process.env[key] = previous;
      }
    });
  });
});
