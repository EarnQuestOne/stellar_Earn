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

/**
 * Environment variable name that overrides the concurrency for a given queue.
 * e.g. queue `payouts` is overridden by `QUEUE_PAYOUTS_CONCURRENCY`.
 */
export function workerConcurrencyEnvKey(queue: string): string {
  return `QUEUE_${queue.toUpperCase()}_CONCURRENCY`;
}

function clampConcurrency(value: number): number {
  return Math.min(MAX_WORKER_CONCURRENCY, Math.max(MIN_WORKER_CONCURRENCY, value));
}

/**
 * Resolve the effective max concurrency for a worker.
 *
 * Resolution order:
 *   1. `QUEUE_<NAME>_CONCURRENCY` environment override (lets ops re-tune from
 *      benchmark results without a code change or redeploy of new defaults).
 *   2. The benchmark-tuned default in {@link JOB_QUEUE_CONFIG}.
 *   3. {@link DEFAULT_WORKER_CONCURRENCY} for queues without a configured value.
 *
 * The result is always an integer clamped to
 * `[MIN_WORKER_CONCURRENCY, MAX_WORKER_CONCURRENCY]`. Non-numeric, fractional,
 * or out-of-range overrides fall back to the configured default rather than
 * throwing, so a bad env var degrades safely instead of crashing worker boot.
 */
export function resolveWorkerConcurrency(
  queue: string,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const configured = JOB_QUEUE_CONFIG[queue]?.concurrency;
  const fallback = clampConcurrency(
    typeof configured === 'number' ? configured : DEFAULT_WORKER_CONCURRENCY,
  );

  const raw = env[workerConcurrencyEnvKey(queue)];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < MIN_WORKER_CONCURRENCY) {
    return fallback;
  }

  return clampConcurrency(parsed);
}
