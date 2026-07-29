/**
 * Benchmark Script for Stellar Account & Trustline Lookup Caching
 *
 * Measures API lookup reduction and latency impact before vs after caching.
 */
import { StellarAccountCacheService } from '../src/modules/stellar/stellar-account-cache.service';

export async function runAccountCacheBenchmark() {
  console.log('=== Stellar Account & Trustline Cache Benchmark ===');

  const configService: any = { get: () => '10000' };
  const cache = new StellarAccountCacheService(configService);

  const iterations = 100;
  const address = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  let horizonCallCount = 0;
  const mockHorizonFetcher = async () => {
    horizonCallCount++;
    // Simulate Horizon network latency ~50ms
    await new Promise((r) => setTimeout(r, 10));
    return { id: address, sequence: '100' };
  };

  // Baseline without caching
  const startUncached = Date.now();
  for (let i = 0; i < iterations; i++) {
    await mockHorizonFetcher();
  }
  const uncachedDuration = Date.now() - startUncached;
  const uncachedCalls = horizonCallCount;

  // Reset metrics
  horizonCallCount = 0;

  // Cached run
  const startCached = Date.now();
  for (let i = 0; i < iterations; i++) {
    await cache.loadAccount(address, mockHorizonFetcher);
  }
  const cachedDuration = Date.now() - startCached;
  const cachedCalls = horizonCallCount;

  console.log(`Uncached Run (${iterations} iterations):`);
  console.log(`  Total Horizon API Calls: ${uncachedCalls}`);
  console.log(`  Total Duration: ${uncachedDuration}ms`);
  console.log(`  Avg Latency per Lookup: ${(uncachedDuration / iterations).toFixed(2)}ms`);

  console.log(`\nCached Run (${iterations} iterations):`);
  console.log(`  Total Horizon API Calls: ${cachedCalls}`);
  console.log(`  Total Duration: ${cachedDuration}ms`);
  console.log(`  Avg Latency per Lookup: ${(cachedDuration / iterations).toFixed(2)}ms`);

  const metrics = cache.getMetrics();
  console.log('\nCache Efficiency:');
  console.log(`  Cache Hit Ratio: ${(metrics.hitRatio * 100).toFixed(1)}% (${metrics.hits} hits, ${metrics.misses} misses)`);
  console.log(`  API Call Savings: -${(((uncachedCalls - cachedCalls) / uncachedCalls) * 100).toFixed(1)}%`);
  console.log(`  Latency Reduction: -${(((uncachedDuration - cachedDuration) / uncachedDuration) * 100).toFixed(1)}%`);
  console.log('=== Benchmark Completed Successfully ===');
}

if (require.main === module) {
  runAccountCacheBenchmark();
}
