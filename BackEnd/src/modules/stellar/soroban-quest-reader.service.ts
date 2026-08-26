import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Address,
  Operation,
  TransactionBuilder,
  rpc,
  nativeToScVal,
  scValToNative,
  Networks,
} from 'stellar-sdk';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';

import { SorobanRpcClientPoolService } from './soroban-rpc-client-pool.service';

export interface OnChainQuestState {
  id: string;
  creator: string;
  reward_asset: string;
  reward_amount: bigint;
  verifier: string;
  deadline: bigint;
  status: 'Active' | 'Paused' | 'Completed' | 'Expired' | 'Cancelled';
  total_claims: number;
}

export interface UserOnChainStats {
  xp: bigint;
  level: number;
  quests_completed: number;
}

/**
 * SorobanQuestReaderService
 * Read-only contract helpers for fetching quest state from the Earn Quest contract.
 */
@Injectable()
export class SorobanQuestReaderService {
  private readonly logger = new Logger(SorobanQuestReaderService.name);

  private readonly rpcServer: rpc.Server;
  private readonly networkPassphrase: string;
  private readonly clientPool: SorobanRpcClientPoolService;
  private readonly readCache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracing: TracingService,
    private readonly metrics: MetricsService,
    @Optional() clientPool?: SorobanRpcClientPoolService,
  ) {
    this.clientPool =
      clientPool ?? new SorobanRpcClientPoolService(this.configService);

    this.cacheTtlMs = parseInt(
      this.configService.get<string>('SOROBAN_READ_CACHE_TTL_MS') || '15000',
      10,
    );

    this.metrics.registerCounter(
      'stellar_contract_read_cache_hits_total',
      'Soroban contract read cache hits',
    );
    this.metrics.registerCounter(
      'stellar_contract_read_cache_misses_total',
      'Soroban contract read cache misses',
    );
    this.metrics.registerGauge(
      'stellar_contract_read_cache_entries',
      'Number of entries in the Soroban contract read cache',
    );

    const network =
      this.configService.get<string>('STELLAR_NETWORK') ||
      this.configService.get<string>('NETWORK') ||
      'TESTNET';

    const normalized = network.toUpperCase();
    this.networkPassphrase =
      normalized === 'PUBLIC' || normalized === 'MAINNET'
        ? Networks.PUBLIC
        : Networks.TESTNET;

    this.rpcServer = this.clientPool.getRpcServer();
  }

  // ── Read cache ─────────────────────────────────────────────────────────────
  // Idempotent contract reads (get_quest / get_user_stats) are cached with a
  // short TTL keyed by contract + args so repeated reads (per-UI-request or
  // per reconciliation pass) don't each pay a Soroban RPC round-trip. Writes
  // invalidate the affected keys via {@link invalidateQuest} /
  // {@link invalidateContract}.

  private cacheKey(contractId: string, argsKey: string): string {
    return `${contractId}:${argsKey}`;
  }

  private getCached<T>(key: string): { hit: boolean; value: T | null } {
    const entry = this.readCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      this.metrics.incrementCounter('stellar_contract_read_cache_hits_total');
      return { hit: true, value: entry.value as T | null };
    }
    this.metrics.incrementCounter('stellar_contract_read_cache_misses_total');
    return { hit: false, value: null };
  }

  private setCached<T>(key: string, value: T | null): void {
    this.readCache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
    this.metrics.setGauge(
      'stellar_contract_read_cache_entries',
      this.readCache.size,
    );
  }

  /**
   * Drop the cached state for a single quest. Call this after an on-chain
   * write that changes that quest's state (e.g. an approval that bumps
   * `total_claims`).
   */
  invalidateQuest(contractId: string, questId: string): void {
    this.readCache.delete(this.cacheKey(contractId, questId));
    this.metrics.setGauge(
      'stellar_contract_read_cache_entries',
      this.readCache.size,
    );
  }

  /** Drop all cached reads for a contract (e.g. after a batch of writes). */
  invalidateContract(contractId: string): void {
    const prefix = `${contractId}:`;
    for (const key of this.readCache.keys()) {
      if (key.startsWith(prefix)) {
        this.readCache.delete(key);
      }
    }
    this.metrics.setGauge(
      'stellar_contract_read_cache_entries',
      this.readCache.size,
    );
  }

  clearCache(): void {
    this.readCache.clear();
    this.metrics.setGauge('stellar_contract_read_cache_entries', 0);
  }

  /**
   * Fetch a quest's on-chain state via `get_quest`, cached with a short TTL
   * keyed by contract + quest id.
   */
  async getQuest(
    contractId: string,
    questId: string,
  ): Promise<OnChainQuestState | null> {
    if (!contractId) throw new Error('Missing contractId');
    if (!questId) throw new Error('Missing questId');

    const key = this.cacheKey(contractId, questId);
    const cached = this.getCached<OnChainQuestState | null>(key);
    if (cached.hit) {
      return cached.value;
    }

    const value = await this.fetchQuestFromContract(contractId, questId);
    this.setCached(key, value);
    return value;
  }

  private async fetchQuestFromContract(
    contractId: string,
    questId: string,
  ): Promise<OnChainQuestState | null> {
    return this.tracing.trace(
      'stellar.contract.get_quest',
      async (span) => {
        span.attributes['stellar.contract.id'] = contractId;
        span.attributes['stellar.contract.function'] = 'get_quest';
        span.attributes['stellar.contract.quest_id'] = questId;

        this.metrics.incrementCounter('stellar_contract_invocations_total', {
          contract_id: contractId,
          function: 'get_quest',
        });

        const startTime = Date.now();

        try {
          // Simulation-only invocation does not require a funded account; a dummy account/sequence is sufficient.
          const source = new Account(
            // Generate a deterministic but valid public key-like value is not required; use contractId as source is invalid.
            // Using a well-formed placeholder would be better, but for simulation the SDK accepts any Account ID string.
            // To avoid failures on strict validation, require caller to supply SOURCE_ACCOUNT if present.
            this.configService.get<string>('SOROBAN_SIM_SOURCE_ACCOUNT') ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          );

          const tx = new TransactionBuilder(source, {
            fee: '100',
            networkPassphrase: this.networkPassphrase,
          })
            .addOperation(
              Operation.invokeContractFunction({
                contract: contractId,
                function: 'get_quest',
                args: [nativeToScVal(questId, { type: 'symbol' })],
              }),
            )
            .setTimeout(0)
            .build();

          const sim = await this.rpcServer.simulateTransaction(tx);

          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: 'get_quest',
              status: 'success',
            },
          );

          if (rpc.Api.isSimulationError(sim)) {
            // "Quest not found" will manifest as a contract error. Treat as missing.
            const errorMsg =
              typeof sim.error === 'string'
                ? sim.error
                : 'unknown simulation error';
            this.logger.warn(
              `Simulation error fetching quest ${questId}: ${errorMsg}`,
            );

            // Record failure in tracing span
            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationError';

            // Record failure in metrics
            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: 'get_quest',
                error_type: 'simulation_error',
              },
            );

            return null;
          }

          if (!rpc.Api.isSimulationSuccess(sim)) {
            const errorMsg = 'Unexpected simulation response';
            this.logger.warn(`${errorMsg} for quest ${questId}`);

            // Record failure in tracing span
            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationFailure';

            // Record failure in metrics
            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: 'get_quest',
                error_type: 'simulation_failure',
              },
            );

            return null;
          }

          const retval = sim.result?.retval;
          if (!retval) {
            span.attributes['stellar.contract.result'] = 'empty';
            return null;
          }

          const native = scValToNative(retval);
          span.attributes['stellar.contract.result'] = 'success';

          // Expected shape: { id, creator, reward_asset, reward_amount, verifier, deadline, status, total_claims }
          return {
            id: String(native.id),
            creator: String(native.creator),
            reward_asset: String(native.reward_asset),
            reward_amount: BigInt(native.reward_amount),
            verifier: String(native.verifier),
            deadline: BigInt(native.deadline),
            status: String(native.status) as OnChainQuestState['status'],
            total_claims: Number(native.total_claims),
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: 'get_quest',
              status: 'failure',
            },
          );

          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Exception during getQuest for quest ${questId}: ${errorMsg}`,
            error instanceof Error ? error.stack : undefined,
          );

          // Record failure in tracing span
          span.status = 'error';
          span.attributes['error.message'] = errorMsg;
          span.attributes['error.type'] =
            error instanceof Error ? error.name : 'UnknownError';

          // Record failure in metrics
          this.metrics.incrementCounter(
            'stellar_contract_invocation_failures_total',
            {
              contract_id: contractId,
              function: 'get_quest',
              error_type: 'exception',
            },
          );

          throw error;
        }
      },
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': 'get_quest',
        'stellar.contract.quest_id': questId,
      },
    );
  }

  /**
   * Batch fetch multiple quest states concurrently with bounded concurrency.
   */
  async getQuestsBatch(
    contractId: string,
    questIds: string[],
    options?: { concurrency?: number },
  ): Promise<(OnChainQuestState | null)[]> {
    if (!contractId) throw new Error('Missing contractId');
    if (!questIds || questIds.length === 0) return [];

    const defaultConcurrency = parseInt(
      this.configService.get<string>('SOROBAN_BATCH_READ_CONCURRENCY') || '10',
      10,
    );
    const concurrencyLimit = Math.max(
      1,
      options?.concurrency ?? defaultConcurrency,
    );

    const startTime = Date.now();
    const results: (OnChainQuestState | null)[] = new Array(
      questIds.length,
    ).fill(null);

    for (let i = 0; i < questIds.length; i += concurrencyLimit) {
      const chunkIds = questIds.slice(i, i + concurrencyLimit);
      const chunkPromises = chunkIds.map((id) => this.getQuest(contractId, id));
      const chunkResults = await Promise.all(chunkPromises);
      for (let j = 0; j < chunkResults.length; j++) {
        results[i + j] = chunkResults[j];
      }
    }

    const duration = Date.now() - startTime;
    this.metrics.observeHistogram(
      'stellar_contract_batch_read_duration_ms',
      duration,
      {
        contract_id: contractId,
      },
    );

    return results;
  }

  /**
   * Fetch a user's on-chain stats (`xp`, `level`, `quests_completed`) via
   * `get_user_stats`, cached with a short TTL keyed by contract + address.
   */
  async getUserStats(
    contractId: string,
    userAddress: string,
  ): Promise<UserOnChainStats | null> {
    if (!contractId) throw new Error('Missing contractId');
    if (!userAddress) throw new Error('Missing userAddress');

    const key = this.cacheKey(contractId, `user:${userAddress}`);
    const cached = this.getCached<UserOnChainStats | null>(key);
    if (cached.hit) {
      return cached.value;
    }

    const value = await this.fetchUserStatsFromContract(
      contractId,
      userAddress,
    );
    this.setCached(key, value);
    return value;
  }

  private async fetchUserStatsFromContract(
    contractId: string,
    userAddress: string,
  ): Promise<UserOnChainStats | null> {
    return this.tracing.trace(
      'stellar.contract.get_user_stats',
      async (span) => {
        span.attributes['stellar.contract.id'] = contractId;
        span.attributes['stellar.contract.function'] = 'get_user_stats';
        span.attributes['stellar.contract.user'] = userAddress;

        this.metrics.incrementCounter('stellar_contract_invocations_total', {
          contract_id: contractId,
          function: 'get_user_stats',
        });

        const startTime = Date.now();

        try {
          // Simulation-only invocation does not require a funded account; a
          // dummy account/sequence is sufficient.
          const source = new Account(
            this.configService.get<string>('SOROBAN_SIM_SOURCE_ACCOUNT') ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          );

          const tx = new TransactionBuilder(source, {
            fee: '100',
            networkPassphrase: this.networkPassphrase,
          })
            .addOperation(
              Operation.invokeContractFunction({
                contract: contractId,
                function: 'get_user_stats',
                args: [new Address(userAddress).toScVal()],
              }),
            )
            .setTimeout(0)
            .build();

          const sim = await this.rpcServer.simulateTransaction(tx);

          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: 'get_user_stats',
              status: 'success',
            },
          );

          if (rpc.Api.isSimulationError(sim)) {
            const errorMsg =
              typeof sim.error === 'string'
                ? sim.error
                : 'unknown simulation error';
            this.logger.warn(
              `Simulation error fetching user stats for ${userAddress}: ${errorMsg}`,
            );
            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationError';
            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: 'get_user_stats',
                error_type: 'simulation_error',
              },
            );
            return null;
          }

          if (!rpc.Api.isSimulationSuccess(sim)) {
            const errorMsg = 'Unexpected simulation response';
            this.logger.warn(`${errorMsg} for user ${userAddress}`);
            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationFailure';
            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: 'get_user_stats',
                error_type: 'simulation_failure',
              },
            );
            return null;
          }

          const retval = sim.result?.retval;
          if (!retval) {
            span.attributes['stellar.contract.result'] = 'empty';
            return null;
          }

          const native = scValToNative(retval) as {
            xp: bigint;
            level: number;
            quests_completed: number;
          };
          span.attributes['stellar.contract.result'] = 'success';

          return {
            xp: BigInt(native.xp),
            level: Number(native.level),
            quests_completed: Number(native.quests_completed),
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: 'get_user_stats',
              status: 'failure',
            },
          );

          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Exception during getUserStats for ${userAddress}: ${errorMsg}`,
            error instanceof Error ? error.stack : undefined,
          );

          span.status = 'error';
          span.attributes['error.message'] = errorMsg;
          span.attributes['error.type'] =
            error instanceof Error ? error.name : 'UnknownError';

          this.metrics.incrementCounter(
            'stellar_contract_invocation_failures_total',
            {
              contract_id: contractId,
              function: 'get_user_stats',
              error_type: 'exception',
            },
          );

          throw error;
        }
      },
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': 'get_user_stats',
        'stellar.contract.user': userAddress,
      },
    );
  }
}
