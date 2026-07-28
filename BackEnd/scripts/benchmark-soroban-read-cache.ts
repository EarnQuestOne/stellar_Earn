import 'reflect-metadata';
import { performance } from 'node:perf_hooks';
import { SorobanContractReadCacheService } from '../src/modules/stellar/soroban-contract-read-cache.service';

interface BenchmarkResult {
  elapsedMs: number;
  operationsPerSecond: number;
  rpcCalls: number;
}

class InMemoryCache {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const iterations = Number.parseInt(
  process.env.SOROBAN_READ_CACHE_BENCHMARK_ITERATIONS || '50000',
  10,
);
const runs = Number.parseInt(
  process.env.SOROBAN_READ_CACHE_BENCHMARK_RUNS || '5',
  10,
);

const memoryCache = new InMemoryCache();
let rpcCalls = 0;

const config = {
  get: (key: string, defaultValue?: unknown) => {
    if (key === 'SOROBAN_READ_CACHE_ENABLED') return 'true';
    if (key === 'SOROBAN_READ_CACHE_TTL_SECONDS') return 15;
    return defaultValue;
  },
};

const metrics = {
  registerCounter: () => undefined,
  incrementCounter: () => undefined,
};

const readCache = new SorobanContractReadCacheService(
  config as never,
  memoryCache as never,
  metrics as never,
);
readCache.onModuleInit();

const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const questId = 'QUEST_BENCH';
const cacheKey = readCache.buildKey(contractId, 'get_quest', [questId]);

async function simulateRpcFetch() {
  rpcCalls += 1;
  await Promise.resolve();
  return {
    kind: 'quest' as const,
    missing: false as const,
    data: {
      id: questId,
      creator: 'GCREATOR',
      reward_asset: 'CASSET',
      reward_amount: '1000',
      verifier: 'GVERIFIER',
      deadline: '1893456000',
      status: 'Active' as const,
      total_claims: 1,
    },
  };
}

async function readWithoutCache(): Promise<number> {
  await simulateRpcFetch();
  return 1;
}

async function readWithCache(): Promise<number> {
  const cached = await readCache.getEnvelope(cacheKey);
  if (cached?.kind === 'quest') {
    return cached.missing ? 0 : 1;
  }
  readCache.recordMiss('get_quest');
  readCache.recordRpcCall('get_quest');
  const envelope = await simulateRpcFetch();
  await readCache.setEnvelope(cacheKey, envelope);
  return 1;
}

function runBenchmark(
  operation: () => Promise<number>,
): Promise<BenchmarkResult> {
  rpcCalls = 0;
  let checksum = 0;
  const startedAt = performance.now();

  return (async () => {
    for (let index = 0; index < iterations; index += 1) {
      checksum += await operation();
    }
    const elapsedMs = performance.now() - startedAt;
    return {
      elapsedMs: Math.round(elapsedMs * 100) / 100,
      operationsPerSecond: Math.round((iterations / elapsedMs) * 1000),
      rpcCalls,
      checksum,
    };
  })();
}

function median(results: BenchmarkResult[]): BenchmarkResult {
  return [...results].sort((left, right) => left.elapsedMs - right.elapsedMs)[
    Math.floor(results.length / 2)
  ];
}

for (let index = 0; index < 100; index += 1) {
  await readWithCache();
}

const beforeSamples: BenchmarkResult[] = [];
const afterSamples: BenchmarkResult[] = [];

for (let run = 0; run < runs; run += 1) {
  await memoryCache.delete(cacheKey);
  beforeSamples.push(await runBenchmark(readWithoutCache));

  await memoryCache.delete(cacheKey);
  await readWithCache();
  afterSamples.push(await runBenchmark(readWithCache));
}

const before = median(beforeSamples);
const after = median(afterSamples);

const summary = {
  iterations,
  runs,
  aggregation: 'median',
  before,
  after,
  improvement: {
    elapsedTimePercent:
      Math.round((1 - after.elapsedMs / before.elapsedMs) * 10_000) / 100,
    throughputMultiplier:
      Math.round(
        (after.operationsPerSecond / before.operationsPerSecond) * 100,
      ) / 100,
    rpcCallReductionPercent:
      Math.round((1 - after.rpcCalls / before.rpcCalls) * 10_000) / 100,
  },
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
