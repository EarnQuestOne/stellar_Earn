import 'reflect-metadata';
import { performance } from 'node:perf_hooks';

interface BenchmarkResult {
  elapsedMs: number;
  operationsPerSecond: number;
}

class FeeEstimateCache {
  private cache: { value: number; expiresAt: number } | null = null;
  private refreshPromise: Promise<number> | null = null;

  constructor(private readonly ttlMs: number) {}

  async getFeeEstimate(fetcher: () => Promise<number>): Promise<number> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const value = await fetcher();
        this.cache = { value, expiresAt: Date.now() + this.ttlMs };
        return value;
      })();
    }

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
}

function runBenchmark(
  operation: () => Promise<void>,
  iterations: number,
): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let completed = 0;

    const next = async () => {
      if (completed >= iterations) {
        const elapsedMs = performance.now() - startedAt;
        resolve({
          elapsedMs: Math.round(elapsedMs * 100) / 100,
          operationsPerSecond: Math.round((iterations / elapsedMs) * 1000),
        });
        return;
      }

      completed += 1;
      void operation().finally(next);
    };

    void next();
  });
}

async function main() {
  const iterations = Number.parseInt(
    process.env.STELLAR_FEE_BENCHMARK_ITERATIONS || '100',
    10,
  );
  const runs = Number.parseInt(
    process.env.STELLAR_FEE_BENCHMARK_RUNS || '5',
    10,
  );
  const ttlMs = Number.parseInt(
    process.env.STELLAR_FEE_ESTIMATE_TTL_MS || '5000',
    10,
  );

  const noCacheResults: BenchmarkResult[] = [];
  const cachedResults: BenchmarkResult[] = [];

  let requestCount = 0;
  const fetcher = async () => {
    requestCount += 1;
    return 130 + (requestCount % 3);
  };

  for (let run = 0; run < runs; run += 1) {
    noCacheResults.push(
      await runBenchmark(async () => {
        await fetcher();
      }, iterations),
    );

    const cache = new FeeEstimateCache(ttlMs);
    cachedResults.push(
      await runBenchmark(async () => {
        await cache.getFeeEstimate(fetcher);
      }, iterations),
    );
  }

  const median = (values: BenchmarkResult[]) =>
    [...values].sort((left, right) => left.elapsedMs - right.elapsedMs)[
      Math.floor(values.length / 2)
    ];

  const before = median(noCacheResults);
  const after = median(cachedResults);

  const summary = {
    iterations,
    runs,
    before,
    after,
    improvement: {
      elapsedTimePercent:
        Math.round((1 - after.elapsedMs / before.elapsedMs) * 10_000) / 100,
      throughputMultiplier:
        Math.round(
          (after.operationsPerSecond / before.operationsPerSecond) * 100,
        ) / 100,
    },
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

void main();
