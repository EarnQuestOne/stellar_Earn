/**
 * Benchmark Script for Soroban Batch Contract Reads
 *
 * Compares execution time of sequential vs. batched contract reads.
 */
import { SorobanQuestReaderService } from '../src/modules/stellar/soroban-quest-reader.service';

export async function runSorobanBatchReadBenchmark() {
  console.log('=== Soroban Batch Contract Read Benchmark ===');

  const configService: any = {
    get: (key: string) => {
      if (key === 'SOROBAN_RPC_URL') return 'https://soroban-testnet.stellar.org';
      if (key === 'STELLAR_NETWORK') return 'TESTNET';
      if (key === 'SOROBAN_BATCH_READ_CONCURRENCY') return '10';
      return undefined;
    },
  };
  const tracingService: any = { trace: (_: string, fn: any) => fn({ attributes: {} }) };
  const metricsService: any = { incrementCounter: () => {}, observeHistogram: () => {} };

  const reader = new SorobanQuestReaderService(configService, tracingService, metricsService);

  const questCount = 20;
  const questIds = Array.from({ length: questCount }, (_, i) => `quest_${i + 1}`);
  const validContractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  // Mock getQuest with simulated network RPC latency (~20ms per read)
  (reader as any).getQuest = async (_: string, id: string) => {
    await new Promise((r) => setTimeout(r, 20));
    return {
      id,
      creator: 'GACC',
      reward_asset: 'XLM',
      reward_amount: BigInt(100),
      verifier: 'GVER',
      deadline: BigInt(1000),
      status: 'Active',
      total_claims: 0,
    };
  };

  // Sequential read benchmark
  const startSequential = Date.now();
  for (const id of questIds) {
    await reader.getQuest(validContractId, id);
  }
  const sequentialDuration = Date.now() - startSequential;

  // Batched read benchmark (concurrency limit = 10)
  const startBatched = Date.now();
  await reader.getQuestsBatch(validContractId, questIds, { concurrency: 10 });
  const batchedDuration = Date.now() - startBatched;

  console.log(`Sequential Read (${questCount} quests):`);
  console.log(`  Total Duration: ${sequentialDuration}ms`);
  console.log(`  Avg Latency per Quest: ${(sequentialDuration / questCount).toFixed(2)}ms`);

  console.log(`\nBatched Read (${questCount} quests, concurrency=10):`);
  console.log(`  Total Duration: ${batchedDuration}ms`);
  console.log(`  Avg Latency per Quest: ${(batchedDuration / questCount).toFixed(2)}ms`);

  console.log('\nPerformance Improvement:');
  console.log(
    `  Latency Savings: -${(((sequentialDuration - batchedDuration) / sequentialDuration) * 100).toFixed(1)}%`,
  );
  console.log(
    `  Speedup Factor: ${(sequentialDuration / batchedDuration).toFixed(2)}x faster`,
  );
  console.log('=== Benchmark Completed Successfully ===');
}

if (require.main === module) {
  runSorobanBatchReadBenchmark();
}
