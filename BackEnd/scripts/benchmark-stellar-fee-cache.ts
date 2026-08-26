import 'reflect-metadata';
import { performance } from 'node:perf_hooks';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../src/common/services/metrics.service';
import { SorobanRpcClientPoolService } from '../src/modules/stellar/soroban-rpc-client-pool.service';
import { StellarFeeService } from '../src/modules/stellar/stellar-fee.service';

/**
 * Benchmark: cached vs uncached Stellar fee estimation (#1980).
 *
 * Before this change every transaction builder waited on a network
 * round-trip to Horizon's `/fee_stats` endpoint. After this change the fee
 * estimate is precomputed, cached with a short TTL, and refreshed in the
 * background, so the payout hot path reads from memory.
 *
 * This script simulates Horizon's network latency and measures both paths:
 *
 *   FEE_BENCHMARK_ITERATIONS        iterations per path (default 1000)
 *   FEE_BENCHMARK_NETWORK_LATENCY_MS simulated Horizon round-trip (default 50)
 *
 * Run: npm run benchmark:stellar-fee-cache
 */
class SimulatedHorizon {
  constructor(private readonly networkLatencyMs: number) {}

  async feeStats(): Promise<{ last_ledger_base_fee: string }> {
    await new Promise((resolve) => setTimeout(resolve, this.networkLatencyMs));
    return { last_ledger_base_fee: '100' };
  }
}

interface BenchmarkResult {
  label: string;
  totalMs: number;
  opsPerSecond: number;
  perOpMs: number;
  checksum: number;
}

const iterations = Number.parseInt(
  process.env.FEE_BENCHMARK_ITERATIONS || '1000',
  10,
);
const networkLatencyMs = Number.parseInt(
  process.env.FEE_BENCHMARK_NETWORK_LATENCY_MS || '50',
  10,
);

async function run(
  label: string,
  operation: () => Promise<number>,
): Promise<BenchmarkResult> {
  let checksum = 0;
  const startedAt = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    checksum += await operation();
  }
  const totalMs = performance.now() - startedAt;
  return {
    label,
    totalMs,
    opsPerSecond: Math.round((iterations / totalMs) * 1000),
    perOpMs: Math.round((totalMs / iterations) * 100) / 100,
    checksum,
  };
}

async function main(): Promise<void> {
  const config = new ConfigService({
    STELLAR_FEE_CACHE_TTL_MS: '30000',
    STELLAR_BASE_FEE: '100',
  });
  const simulatedHorizon = new SimulatedHorizon(networkLatencyMs);
  const metrics = new MetricsService();
  const clientPool = {
    getHorizonServer: () => simulatedHorizon,
  } as unknown as SorobanRpcClientPoolService;

  const feeService = new StellarFeeService(config, clientPool, metrics);
  feeService.onModuleInit();

  // Let the background warm-up fetch complete before benchmarking.
  await new Promise((resolve) => setTimeout(resolve, networkLatencyMs + 50));

  // "Before": uncached — every fee estimate pays the network round-trip.
  const before = await run('uncached (network fetch per call)', () =>
    simulatedHorizon.feeStats().then((s) => Number.parseInt(s.last_ledger_base_fee, 10)),
  );

  // "After": cached — the estimate is served from memory.
  const after = await run('cached (in-memory read)', () =>
    feeService.getBaseFeeInStroops(),
  );

  const speedup = before.perOpMs / after.perOpMs;

  console.log('\n=== Stellar fee-estimate benchmark ===');
  console.log(
    `iterations: ${iterations} | simulated Horizon latency: ${networkLatencyMs}ms`,
  );
  console.table([before, after]);
  console.log(
    `\nSpeedup: ${speedup.toFixed(1)}x faster (${before.perOpMs}ms/op vs ${after.perOpMs}ms/op)`,
  );

  const snapshot = metrics.getSnapshot().metrics as Record<string, unknown>;
  const feeMetrics = Object.fromEntries(
    Object.entries(snapshot).filter(([name]) => name.startsWith('stellar_fee_')),
  );
  console.log('\n=== Captured fee metrics ===');
  console.log(JSON.stringify(feeMetrics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
