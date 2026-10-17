/**
 * Benchmark Script for Soroban RPC & Horizon Client Pooling
 *
 * Measures connection setup overhead reduction before vs after pooling.
 */
import { SorobanRpcClientPoolService } from '../src/modules/stellar/soroban-rpc-client-pool.service';
import { rpc } from 'stellar-sdk';
import * as StellarSdk from 'stellar-sdk';

export async function runClientPoolBenchmark() {
  console.log('=== Soroban RPC & Horizon Connection Pooling Benchmark ===');

  const iterations = 500;
  const rpcUrl = 'https://soroban-testnet.stellar.org';
  const horizonUrl = 'https://horizon-testnet.stellar.org';

  // Unpooled execution (re-instantiating client on every request)
  const startUnpooled = Date.now();
  for (let i = 0; i < iterations; i++) {
    const _rpc = new rpc.Server(rpcUrl);
    const _horizon = new StellarSdk.Horizon.Server(horizonUrl);
  }
  const unpooledDuration = Date.now() - startUnpooled;

  // Pooled execution (reusing singleton provider)
  const configService: any = {
    get: (key: string) => {
      if (key === 'SOROBAN_RPC_URL') return rpcUrl;
      if (key === 'STELLAR_HORIZON_URL') return horizonUrl;
      if (key === 'SOROBAN_RPC_TIMEOUT_MS') return '15000';
      if (key === 'SOROBAN_RPC_MAX_SOCKETS') return '50';
      return undefined;
    },
  };

  const poolService = new SorobanRpcClientPoolService(configService);
  poolService.onModuleInit();

  const startPooled = Date.now();
  for (let i = 0; i < iterations; i++) {
    const _rpc = poolService.getRpcServer();
    const _horizon = poolService.getHorizonServer();
  }
  const pooledDuration = Date.now() - startPooled;

  console.log(`Unpooled Client Instantiation (${iterations} iterations):`);
  console.log(`  Total Setup Time: ${unpooledDuration}ms`);
  console.log(`  Avg Setup Overhead per Req: ${(unpooledDuration / iterations).toFixed(3)}ms`);

  console.log(`\nPooled Singleton Access (${iterations} iterations):`);
  console.log(`  Total Access Time: ${pooledDuration}ms`);
  console.log(`  Avg Access Overhead per Req: ${(pooledDuration / iterations).toFixed(3)}ms`);

  const metrics = poolService.getPoolMetrics();
  console.log('\nPooling Efficiency:');
  console.log(`  Socket Pool Max Sockets: ${metrics.httpMaxSockets}`);
  console.log(`  Setup Time Savings: -${(((unpooledDuration - pooledDuration) / unpooledDuration) * 100).toFixed(1)}%`);
  console.log(`  Speedup Factor: ${(unpooledDuration / Math.max(1, pooledDuration)).toFixed(2)}x faster`);
  console.log('=== Benchmark Completed Successfully ===');
}

if (require.main === module) {
  runClientPoolBenchmark();
}
