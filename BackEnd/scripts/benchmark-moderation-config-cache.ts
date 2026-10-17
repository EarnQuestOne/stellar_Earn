import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { performance } from 'node:perf_hooks';
import { ModerationConfigCacheService } from '../src/modules/moderation/moderation-config-cache.service';

interface BenchmarkResult {
  elapsedMs: number;
  operationsPerSecond: number;
  sourceReads: number;
  checksum: number;
}

class CountingConfigSource {
  sourceReads = 0;

  constructor(private readonly config: ConfigService) {}

  get<T>(key: string): T | undefined {
    this.sourceReads += 1;
    return this.config.get<T>(key);
  }

  set(key: string, value: unknown): void {
    this.config.set(key, value);
  }
}

const iterations = Number.parseInt(
  process.env.MODERATION_CONFIG_BENCHMARK_ITERATIONS || '1000000',
  10,
);
const runs = Number.parseInt(
  process.env.MODERATION_CONFIG_BENCHMARK_RUNS || '5',
  10,
);
const nestConfig = new ConfigService({
  moderation: {
    blockOnHighSeverity: true,
    highThreshold: 0.85,
    mediumThreshold: 0.5,
    externalApiUrl: '',
    externalApiKey: '',
    imageApiUrl: '',
    imageApiKey: '',
    blockedKeywords: [],
    blockedImageHosts: [],
  },
});
const source = new CountingConfigSource(nestConfig);
const configCache = new ModerationConfigCacheService(
  source as unknown as ConfigService,
);

function runBenchmark(operation: () => number): BenchmarkResult {
  source.sourceReads = 0;
  let checksum = 0;
  const startedAt = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    checksum += operation();
  }

  const elapsedMs = performance.now() - startedAt;
  return {
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    operationsPerSecond: Math.round((iterations / elapsedMs) * 1000),
    sourceReads: source.sourceReads,
    checksum,
  };
}

function median(results: BenchmarkResult[]): BenchmarkResult {
  return [...results].sort((left, right) => left.elapsedMs - right.elapsedMs)[
    Math.floor(results.length / 2)
  ];
}

for (let index = 0; index < 50_000; index += 1) {
  nestConfig.get<number>('moderation.highThreshold');
  configCache.getConfig();
}

const beforeSamples: BenchmarkResult[] = [];
const afterSamples: BenchmarkResult[] = [];

for (let run = 0; run < runs; run += 1) {
  beforeSamples.push(
    runBenchmark(() => {
      const high = source.get<number>('moderation.highThreshold') ?? 0.85;
      const medium = source.get<number>('moderation.mediumThreshold') ?? 0.5;
      const block =
        source.get<boolean>('moderation.blockOnHighSeverity') !== false ? 1 : 0;
      return high + medium + block;
    }),
  );

  configCache.invalidate();
  afterSamples.push(
    runBenchmark(() => {
      const config = configCache.getConfig();
      return (
        config.highThreshold +
        config.mediumThreshold +
        (config.blockOnHighSeverity ? 1 : 0)
      );
    }),
  );
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
    sourceReadReductionPercent:
      Math.round((1 - after.sourceReads / before.sourceReads) * 10_000) / 100,
  },
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
