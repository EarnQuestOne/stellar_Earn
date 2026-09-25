/**
 * Benchmark Script for BullMQ Payout Queue Worker Concurrency & Rate Limiting
 *
 * Demonstrates throughput and rate-limiting efficiency before and after tuning.
 */
import {
  resolveWorkerConcurrency,
  resolveWorkerLimiter,
} from '../src/modules/jobs/utils/worker-concurrency.util';

export function runPayoutQueueBenchmark() {
  console.log('=== BullMQ Payout Queue Concurrency & Rate Limit Benchmark ===');

  const defaultConcurrency = resolveWorkerConcurrency('payouts', {});
  const defaultLimiter = resolveWorkerLimiter('payouts', {});

  console.log('Default Configuration:');
  console.log(`  Concurrency: ${defaultConcurrency} workers`);
  console.log(
    `  Rate Limiter: max ${defaultLimiter?.max} jobs per ${defaultLimiter?.duration}ms`,
  );

  // Simulated throughput calculation
  const defaultThroughput = (defaultLimiter?.max ?? 10) * (1000 / (defaultLimiter?.duration ?? 1000));
  console.log(`  Theoretical Max Throughput: ${defaultThroughput} jobs/sec`);

  // Simulated high throughput env configuration
  const highPerfEnv = {
    PAYOUT_QUEUE_CONCURRENCY: '25',
    PAYOUT_QUEUE_MAX_JOBS: '100',
    PAYOUT_QUEUE_DURATION_MS: '1000',
  };

  const tunedConcurrency = resolveWorkerConcurrency('payouts', highPerfEnv);
  const tunedLimiter = resolveWorkerLimiter('payouts', highPerfEnv);
  const tunedThroughput = (tunedLimiter?.max ?? 10) * (1000 / (tunedLimiter?.duration ?? 1000));

  console.log('\nTuned High-Performance Configuration:');
  console.log(`  Concurrency: ${tunedConcurrency} workers`);
  console.log(
    `  Rate Limiter: max ${tunedLimiter?.max} jobs per ${tunedLimiter?.duration}ms`,
  );
  console.log(`  Theoretical Max Throughput: ${tunedThroughput} jobs/sec`);

  console.log('\nPerformance Improvement:');
  console.log(
    `  Throughput Boost: +${(((tunedThroughput - defaultThroughput) / defaultThroughput) * 100).toFixed(1)}%`,
  );
  console.log('=== Benchmark Completed Successfully ===');
}

if (require.main === module) {
  runPayoutQueueBenchmark();
}
