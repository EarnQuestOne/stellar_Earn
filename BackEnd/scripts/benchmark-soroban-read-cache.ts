import 'reflect-metadata';
import { performance } from 'node:perf_hooks';
import * as StellarSdk from 'stellar-sdk';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../src/common/services/metrics.service';
import { TracingService } from '../src/common/tracing/tracing.service';
import { SorobanQuestReaderService } from '../src/modules/stellar/soroban-quest-reader.service';

/**
 * Benchmark: cached vs uncached Soroban contract reads (#1975).
 *
 * Before this change every `get_quest` / `get_user_stats` read paid a full
 * Soroban RPC round-trip. After this change reads are served from a
 * short-TTL in-memory cache, so repeated reads are effectively free.
 *
 * This script simulates the RPC latency and measures both paths:
 *
 *   SOROBAN_READ_BENCHMARK_ITERATIONS        iterations per path (default 1000)
 *   SOROBAN_READ_BENCHMARK_LATENCY_MS        simulated RPC round-trip (default 50)
 *
 * Run: npm run benchmark:soroban-read-cache
 */
class SimulatedRpc {
  constructor(private readonly latencyMs: number) {}

  async simulateTransaction(): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    return { result: { retval: { _type: 'struct' } } };
  }
}

interface BenchmarkResult {
  label: string;
  totalMs: number;
  opsPerSecond: number;
  perOpMs: number;
}

const iterations = Number.parseInt(
  process.env.SOROBAN_READ_BENCHMARK_ITERATIONS || '1000',
  10,
);
const latencyMs = Number.parseInt(
  process.env.SOROBAN_READ_BENCHMARK_LATENCY_MS || '50',
  10,
);

async function run(
  label: string,
  operation: () => Promise<unknown>,
): Promise<BenchmarkResult> {
  let checksum = 0;
  const startedAt = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    const value = await operation();
    checksum += value ? 1 : 0;
  }
  const totalMs = performance.now() - startedAt;
  return {
    label,
    totalMs,
    opsPerSecond: Math.round((iterations / totalMs) * 1000),
    perOpMs: Math.round((totalMs / iterations) * 100) / 100,
  };
}

async function main(): Promise<void> {
  const config = new ConfigService({
    SOROBAN_READ_CACHE_TTL_MS: '15000',
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    STELLAR_NETWORK: 'TESTNET',
  });
  const metrics = new MetricsService();
  const tracing = {
    trace: async (_name: string, fn: any, _attrs?: any) => {
      return fn({ attributes: {} as Record<string, any>, status: 'ok' });
    },
  } as unknown as TracingService;
  const simulatedRpc = new SimulatedRpc(latencyMs);
  const clientPool = {
    getRpcServer: () => simulatedRpc,
  } as any;

  const reader = new SorobanQuestReaderService(config, tracing, metrics, clientPool);
  const contractId = StellarSdk.StrKey.encodeContract(Buffer.alloc(32));
  const questId = 'quest_1';

  // "Before": uncached — every read pays the RPC round-trip (cache cleared
  // before each iteration so each read is a genuine miss).
  const before = await run('uncached (RPC per read)', async () => {
    reader.clearCache();
    return reader.getQuest(contractId, questId);
  });

  // "After": cached — warm the entry once, then read from memory.
  await reader.getQuest(contractId, questId);
  const after = await run('cached (in-memory read)', () =>
    reader.getQuest(contractId, questId),
  );

  const speedup = before.perOpMs / after.perOpMs;

  console.log('\n=== Soroban read-cache benchmark ===');
  console.log(
    `iterations: ${iterations} | simulated RPC latency: ${latencyMs}ms`,
  );
  console.table([before, after]);
  console.log(
    `\nSpeedup: ${speedup.toFixed(1)}x faster (${before.perOpMs}ms/op vs ${after.perOpMs}ms/op)`,
  );

  const snapshot = metrics.getSnapshot().metrics as Record<string, unknown>;
  const cacheMetrics = Object.fromEntries(
    Object.entries(snapshot).filter(([name]) =>
      name.startsWith('stellar_contract_read_cache_'),
    ),
  );
  console.log('\n=== Captured cache metrics ===');
  console.log(JSON.stringify(cacheMetrics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
