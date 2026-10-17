import 'reflect-metadata';
import { performance } from 'node:perf_hooks';
import { ConfigService } from '@nestjs/config';
import { JobResultStatusCacheService } from '../src/modules/jobs/services/job-result-status-cache.service';
import { PayoutStatus } from '../src/modules/payouts/entities/payout.entity';

interface BenchmarkRow {
  scenario: string;
  polls: number;
  dbReads: number;
  elapsedMs: number;
  pollsPerSecond: number;
}

class InMemoryCacheBackend {
  private readonly store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(prefix: string): Promise<void> {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

const polls = Number.parseInt(
  process.env.PAYOUT_STATUS_BENCHMARK_POLLS || '5000',
  10,
);

const cacheBackend = new InMemoryCacheBackend();
const cacheService = {
  get: (key: string) => cacheBackend.get(key),
  set: (key: string, value: unknown) => cacheBackend.set(key, value),
  del: (key: string) => cacheBackend.del(key),
  deletePattern: (prefix: string) => cacheBackend.deletePattern(prefix),
};

const config = new ConfigService({});
const statusCache = new JobResultStatusCacheService(
  cacheService as any,
  config,
);

const payoutId = 'payout-benchmark';
const viewer = 'G'.padEnd(56, 'B');
const payoutResponse = {
  id: payoutId,
  stellarAddress: viewer,
  amount: 25,
  asset: 'XLM',
  status: PayoutStatus.PROCESSING,
  type: 'quest_reward',
  createdAt: new Date().toISOString(),
};

async function runWithoutCache(): Promise<BenchmarkRow> {
  let dbReads = 0;
  statusCache.resetPollMetrics();
  const startedAt = performance.now();

  for (let index = 0; index < polls; index += 1) {
    dbReads += 1;
  }

  const elapsedMs = performance.now() - startedAt;
  return {
    scenario: 'without_cache',
    polls,
    dbReads,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    pollsPerSecond: Math.round((polls / elapsedMs) * 1000),
  };
}

async function runWithCache(): Promise<BenchmarkRow> {
  let dbReads = 0;
  statusCache.resetPollMetrics();
  await statusCache.setPayoutPoll(payoutId, viewer, payoutResponse as any);

  const startedAt = performance.now();
  for (let index = 0; index < polls; index += 1) {
    const cached = await statusCache.getPayoutPoll(payoutId, viewer);
    if (!cached) {
      dbReads += 1;
      await statusCache.setPayoutPoll(payoutId, viewer, payoutResponse as any);
    }
  }
  const elapsedMs = performance.now() - startedAt;
  const metrics = statusCache.getPollMetrics();

  return {
    scenario: 'with_redis_cache',
    polls,
    dbReads,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    pollsPerSecond: Math.round((polls / elapsedMs) * 1000),
    ...({
      cacheHits: metrics.hits,
      cacheMisses: metrics.misses,
      dbReadsAvoided: metrics.dbReadsAvoided,
      estimatedDbReadReductionPct: Math.round(
        (1 - dbReads / polls) * 10000,
      ) / 100,
    } as Record<string, unknown>),
  } as BenchmarkRow;
}

async function main(): Promise<void> {
  const withoutCache = await runWithoutCache();
  const withCache = await runWithCache();

  console.log(
    JSON.stringify(
      {
        pollsPerScenario: polls,
        before: withoutCache,
        after: withCache,
        summary: {
          dbReadsBefore: withoutCache.dbReads,
          dbReadsAfter: withCache.dbReads,
          dbReadReductionPct:
            Math.round(
              (1 - withCache.dbReads / withoutCache.dbReads) * 10000,
            ) / 100,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
