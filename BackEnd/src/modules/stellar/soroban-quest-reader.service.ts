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
  xdr,
} from 'stellar-sdk';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';
import {
  CachedQuestPayload,
  CachedUserStatsPayload,
  SorobanContractReadCacheService,
} from './soroban-contract-read-cache.service';

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

export interface OnChainUserStats {
  xp: bigint;
  level: number;
  quests_completed: number;
}

/**
 * SorobanQuestReaderService
 * Read-only contract helpers for fetching quest/user state from the Earn Quest contract.
 */
@Injectable()
export class SorobanQuestReaderService {
  private readonly logger = new Logger(SorobanQuestReaderService.name);

  private readonly rpcServer: rpc.Server;
  private readonly networkPassphrase: string;
  private readonly clientPool: SorobanRpcClientPoolService;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracing: TracingService,
    private readonly metrics: MetricsService,
<<<<<<< HEAD
    private readonly readCache: SorobanContractReadCacheService,
=======
    @Optional() clientPool?: SorobanRpcClientPoolService,
>>>>>>> origin/main
  ) {
    this.clientPool =
      clientPool ?? new SorobanRpcClientPoolService(this.configService);

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

  /** Legacy alias for `get_quest` (issue/docs refer to get_task). */
  async getTask(
    contractId: string,
    taskId: string,
  ): Promise<OnChainQuestState | null> {
    return this.getQuest(contractId, taskId);
  }

  async getQuest(
    contractId: string,
    questId: string,
  ): Promise<OnChainQuestState | null> {
    if (!contractId) throw new Error('Missing contractId');
    if (!questId) throw new Error('Missing questId');

    const cacheKey = this.readCache.buildKey(contractId, 'get_quest', [
      questId,
    ]);
    const cached = await this.readCache.getEnvelope(cacheKey);
    if (cached?.kind === 'quest') {
      this.readCache.recordHit('get_quest');
      if (cached.missing) {
        return null;
      }
      return this.deserializeQuest(cached.data);
    }

    this.readCache.recordMiss('get_quest');
    this.readCache.recordRpcCall('get_quest');

    const result = await this.simulateContractRead(
      contractId,
      'get_quest',
      [nativeToScVal(questId, { type: 'symbol' })],
      'stellar.contract.get_quest',
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': 'get_quest',
        'stellar.contract.quest_id': questId,
      },
      (native) => this.mapQuestNative(native),
    );

    if (result === null) {
      await this.readCache.setEnvelope(cacheKey, {
        kind: 'quest',
        missing: true,
      });
      return null;
    }

    await this.readCache.setEnvelope(cacheKey, {
      kind: 'quest',
      missing: false,
      data: this.serializeQuest(result),
    });
    return result;
  }

  async getUserStats(
    contractId: string,
    userAddress: string,
  ): Promise<OnChainUserStats> {
    if (!contractId) throw new Error('Missing contractId');
    if (!userAddress) throw new Error('Missing userAddress');

    const cacheKey = this.readCache.buildKey(contractId, 'get_user_stats', [
      userAddress,
    ]);
    const cached = await this.readCache.getEnvelope(cacheKey);
    if (cached?.kind === 'user_stats') {
      this.readCache.recordHit('get_user_stats');
      return this.deserializeUserStats(cached.data);
    }

    this.readCache.recordMiss('get_user_stats');
    this.readCache.recordRpcCall('get_user_stats');

    const result = await this.simulateContractRead(
      contractId,
      'get_user_stats',
      [new Address(userAddress).toScVal()],
      'stellar.contract.get_user_stats',
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': 'get_user_stats',
        'stellar.contract.user': userAddress,
      },
      (native) => this.mapUserStatsNative(native),
    );

    const stats = result ?? {
      xp: 0n,
      level: 0,
      quests_completed: 0,
    };

    await this.readCache.setEnvelope(cacheKey, {
      kind: 'user_stats',
      data: this.serializeUserStats(stats),
    });
    return stats;
  }

  private serializeQuest(quest: OnChainQuestState): CachedQuestPayload {
    return {
      id: quest.id,
      creator: quest.creator,
      reward_asset: quest.reward_asset,
      reward_amount: quest.reward_amount.toString(),
      verifier: quest.verifier,
      deadline: quest.deadline.toString(),
      status: quest.status,
      total_claims: quest.total_claims,
    };
  }

  private deserializeQuest(payload: CachedQuestPayload): OnChainQuestState {
    return {
      id: payload.id,
      creator: payload.creator,
      reward_asset: payload.reward_asset,
      reward_amount: BigInt(payload.reward_amount),
      verifier: payload.verifier,
      deadline: BigInt(payload.deadline),
      status: payload.status,
      total_claims: payload.total_claims,
    };
  }

  private serializeUserStats(stats: OnChainUserStats): CachedUserStatsPayload {
    return {
      xp: stats.xp.toString(),
      level: stats.level,
      quests_completed: stats.quests_completed,
    };
  }

  private deserializeUserStats(
    payload: CachedUserStatsPayload,
  ): OnChainUserStats {
    return {
      xp: BigInt(payload.xp),
      level: payload.level,
      quests_completed: payload.quests_completed,
    };
  }

  private mapQuestNative(native: unknown): OnChainQuestState | null {
    if (!native || typeof native !== 'object') {
      return null;
    }
    const record = native as Record<string, unknown>;
    return {
      id: String(record.id),
      creator: String(record.creator),
      reward_asset: String(record.reward_asset),
      reward_amount: BigInt(record.reward_amount as string | number | bigint),
      verifier: String(record.verifier),
      deadline: BigInt(record.deadline as string | number | bigint),
      status: String(record.status) as OnChainQuestState['status'],
      total_claims: Number(record.total_claims),
    };
  }

  private mapUserStatsNative(native: unknown): OnChainUserStats | null {
    if (!native || typeof native !== 'object') {
      return null;
    }
    const record = native as Record<string, unknown>;
    return {
      xp: BigInt(record.xp as string | number | bigint),
      level: Number(record.level),
      quests_completed: Number(record.quests_completed),
    };
  }

  private async simulateContractRead<T>(
    contractId: string,
    functionName: string,
    args: xdr.ScVal[],
    traceName: string,
    traceAttributes: Record<string, string>,
    mapResult: (native: unknown) => T | null,
  ): Promise<T | null> {
    return this.tracing.trace(
      traceName,
      async (span) => {
        Object.assign(span.attributes, traceAttributes);

        this.metrics.incrementCounter('stellar_contract_invocations_total', {
          contract_id: contractId,
          function: functionName,
        });

        const startTime = Date.now();

        try {
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
                function: functionName,
                args,
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
              function: functionName,
              status: 'success',
            },
          );

          if (rpc.Api.isSimulationError(sim)) {
            const errorMsg =
              typeof sim.error === 'string'
                ? sim.error
                : 'unknown simulation error';
            this.logger.warn(
              `Simulation error for ${functionName}: ${errorMsg}`,
            );

            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationError';

            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: functionName,
                error_type: 'simulation_error',
              },
            );

            return null;
          }

          if (!rpc.Api.isSimulationSuccess(sim)) {
            const errorMsg = 'Unexpected simulation response';
            this.logger.warn(`${errorMsg} for ${functionName}`);

            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationFailure';

            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: functionName,
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
          return mapResult(native);
        } catch (error) {
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: functionName,
              status: 'failure',
            },
          );

          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Exception during ${functionName}: ${errorMsg}`,
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
              function: functionName,
              error_type: 'exception',
            },
          );

          throw error;
        }
      },
      traceAttributes,
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
}
