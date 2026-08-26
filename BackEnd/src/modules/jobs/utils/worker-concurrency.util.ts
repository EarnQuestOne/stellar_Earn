import { JOB_QUEUE_CONFIG } from '../jobs.constants';

/**
 * Lower bound for worker concurrency. A worker must process at least one job
 * at a time, so any override below this is treated as a misconfiguration.
 */
export const MIN_WORKER_CONCURRENCY = 1;

/**
 * Upper bound for worker concurrency. This is a safety guardrail: benchmark
 * results inform the per-queue defaults in {@link JOB_QUEUE_CONFIG}, but an
 * operator override should never be allowed to exhaust the database pool or
 * the Redis connection budget. Anything above this is clamped down.
 */
export const MAX_WORKER_CONCURRENCY = 100;

/**
 * Fallback used when a queue has no benchmark-tuned default in
 * {@link JOB_QUEUE_CONFIG}.
 */
export const DEFAULT_WORKER_CONCURRENCY = 5;

export interface WorkerLimiterConfig {
  max: number;
  duration: number;
}

/**
 * Environment variable name that overrides the concurrency for a given queue.
 * e.g. queue `payouts` is overridden by `PAYOUT_QUEUE_CONCURRENCY` or `QUEUE_PAYOUTS_CONCURRENCY`.
 */
export function workerConcurrencyEnvKeys(queue: string): string[] {
  const upper = queue.toUpperCase();
  const keys = [`QUEUE_${upper}_CONCURRENCY`];
  if (upper === 'PAYOUTS') {
    keys.unshift('PAYOUT_QUEUE_CONCURRENCY');
  }
  return keys;
}

/**
 * Environment variable names that override rate limit parameters for a given queue.
 */
export function workerLimiterMaxEnvKeys(queue: string): string[] {
  const upper = queue.toUpperCase();
  const keys = [`QUEUE_${upper}_MAX_JOBS`];
  if (upper === 'PAYOUTS') {
    keys.unshift('PAYOUT_QUEUE_MAX_JOBS');
  }
  return keys;
}

export function workerLimiterDurationEnvKeys(queue: string): string[] {
  const upper = queue.toUpperCase();
  const keys = [`QUEUE_${upper}_DURATION_MS`];
  if (upper === 'PAYOUTS') {
    keys.unshift('PAYOUT_QUEUE_DURATION_MS');
  }
  return keys;
}

function clampConcurrency(value: number): number {
  return Math.min(
    MAX_WORKER_CONCURRENCY,
    Math.max(MIN_WORKER_CONCURRENCY, value),
  );
}

/**
 * Resolve the effective max concurrency for a worker.
 */
export function resolveWorkerConcurrency(
  queue: string,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const configured = (JOB_QUEUE_CONFIG as Record<string, any>)[queue]
    ?.concurrency;
  const fallback = clampConcurrency(
    typeof configured === 'number' ? configured : DEFAULT_WORKER_CONCURRENCY,
  );

  const keys = workerConcurrencyEnvKeys(queue);
  for (const key of keys) {
    const raw = env[key];
    if (raw !== undefined && raw.trim() !== '') {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed >= MIN_WORKER_CONCURRENCY) {
        return clampConcurrency(parsed);
      }
    }
  }

  return fallback;
}

/**
 * Resolve the effective rate limiter config for a worker.
 */
export function resolveWorkerLimiter(
  queue: string,
  env: NodeJS.ProcessEnv = process.env,
): WorkerLimiterConfig | undefined {
  const configured: WorkerLimiterConfig | undefined = (
    JOB_QUEUE_CONFIG as Record<string, any>
  )[queue]?.limiter;

  let max = configured?.max;
  let duration = configured?.duration;

  const maxKeys = workerLimiterMaxEnvKeys(queue);
  for (const key of maxKeys) {
    const raw = env[key];
    if (raw !== undefined && raw.trim() !== '') {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed > 0) {
        max = parsed;
        break;
      }
    }
  }

  const durationKeys = workerLimiterDurationEnvKeys(queue);
  for (const key of durationKeys) {
    const raw = env[key];
    if (raw !== undefined && raw.trim() !== '') {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed > 0) {
        duration = parsed;
        break;
      }
    }
  }

  if (max && duration) {
    return { max, duration };
  }

  return undefined;
}
