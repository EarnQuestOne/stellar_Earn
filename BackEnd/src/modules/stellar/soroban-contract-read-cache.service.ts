import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../../common/services/metrics.service';
import { redisKey } from '../cache/cache-keys';
import { CACHE_TTL } from '../../config/cache.config';

export type SorobanReadFunctionName = 'get_quest' | 'get_user_stats';

/** JSON-safe quest snapshot for cache storage (bigint fields as decimal strings). */
export interface CachedQuestPayload {
  id: string;
  creator: string;
  reward_asset: string;
  reward_amount: string;
  verifier: string;
  deadline: string;
  status: 'Active' | 'Paused' | 'Completed' | 'Expired' | 'Cancelled';
  total_claims: number;
}

export interface CachedUserStatsPayload {
  xp: string;
  level: number;
  quests_completed: number;
}

type CachedEnvelope =
  | { kind: 'quest'; missing: true }
  | { kind: 'quest'; missing: false; data: CachedQuestPayload }
  | { kind: 'user_stats'; data: CachedUserStatsPayload };

const QUEST_EVENT_MARKERS = [
  'quest_reg',
  'quest.registered',
  'q_pause',
  'q_resume',
  'q_cancel',
  'sub_appr',
  'claimed',
  'proof_sub',
];

const USER_STATS_EVENT_MARKERS = [
  'xp_award',
  'level_up',
  'badge_grt',
  'sub_appr',
  'claimed',
];

@Injectable()
export class SorobanContractReadCacheService implements OnModuleInit {
  private readonly logger = new Logger(SorobanContractReadCacheService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.metrics.registerCounter(
      'soroban_contract_read_cache_hits_total',
      'Soroban idempotent contract read cache hits',
    );
    this.metrics.registerCounter(
      'soroban_contract_read_cache_misses_total',
      'Soroban idempotent contract read cache misses',
    );
    this.metrics.registerCounter(
      'soroban_contract_read_cache_invalidations_total',
      'Soroban contract read cache invalidations',
    );
    this.metrics.registerCounter(
      'soroban_contract_read_rpc_calls_total',
      'Soroban RPC simulations for cacheable contract reads',
    );
  }

  isEnabled(): boolean {
    const flag = this.configService.get<string>(
      'SOROBAN_READ_CACHE_ENABLED',
      'true',
    );
    return flag.toLowerCase() !== 'false';
  }

  ttlSeconds(): number {
    const configured = this.configService.get<number>(
      'SOROBAN_READ_CACHE_TTL_SECONDS',
    );
    if (typeof configured === 'number' && configured > 0) {
      return configured;
    }
    const parsed = Number(
      this.configService.get<string>('SOROBAN_READ_CACHE_TTL_SECONDS') ??
        CACHE_TTL.SOROBAN_READ,
    );
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : CACHE_TTL.SOROBAN_READ;
  }

  buildKey(
    contractId: string,
    functionName: SorobanReadFunctionName,
    args: string[],
  ): string {
    const argsKey = args.map((part) => encodeURIComponent(part)).join('|');
    return redisKey('soroban_read', contractId, functionName, argsKey);
  }

  async getEnvelope(key: string): Promise<CachedEnvelope | undefined> {
    if (!this.isEnabled()) {
      return undefined;
    }
    return this.cacheService.get<CachedEnvelope>(key);
  }

  async setEnvelope(key: string, envelope: CachedEnvelope): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.cacheService.set(key, envelope, this.ttlSeconds());
  }

  recordHit(functionName: SorobanReadFunctionName): void {
    this.metrics.incrementCounter('soroban_contract_read_cache_hits_total', {
      function: functionName,
    });
  }

  recordMiss(functionName: SorobanReadFunctionName): void {
    this.metrics.incrementCounter('soroban_contract_read_cache_misses_total', {
      function: functionName,
    });
  }

  recordRpcCall(functionName: SorobanReadFunctionName): void {
    this.metrics.incrementCounter('soroban_contract_read_rpc_calls_total', {
      function: functionName,
    });
  }

  recordInvalidation(reason: string): void {
    this.metrics.incrementCounter(
      'soroban_contract_read_cache_invalidations_total',
      { reason },
    );
  }

  async invalidateQuest(
    contractId: string,
    questId: string,
  ): Promise<void> {
    const key = this.buildKey(contractId, 'get_quest', [questId]);
    await this.cacheService.delete(key);
    this.recordInvalidation('quest');
    this.logger.debug(`Invalidated Soroban read cache for quest ${questId}`);
  }

  async invalidateUserStats(
    contractId: string,
    userAddress: string,
  ): Promise<void> {
    const key = this.buildKey(contractId, 'get_user_stats', [userAddress]);
    await this.cacheService.delete(key);
    this.recordInvalidation('user_stats');
    this.logger.debug(
      `Invalidated Soroban read cache for user stats ${userAddress}`,
    );
  }

  /**
   * Invalidate cached reads based on an ingested on-chain contract event.
   */
  async invalidateFromContractEvent(
    contractId: string,
    eventName: string,
    topics: unknown[],
  ): Promise<void> {
    const normalized = eventName.toLowerCase();
    const questId = this.extractQuestId(topics);
    const userAddress = this.extractUserAddress(topics);

    const touchesQuest = QUEST_EVENT_MARKERS.some((marker) =>
      normalized.includes(marker),
    );
    const touchesUser = USER_STATS_EVENT_MARKERS.some((marker) =>
      normalized.includes(marker),
    );

    if (touchesQuest && questId) {
      await this.invalidateQuest(contractId, questId);
    }
    if (touchesUser && userAddress) {
      await this.invalidateUserStats(contractId, userAddress);
    }
  }

  async invalidateAfterWrite(
    contractId: string,
    questId: string,
    submitterAddress: string,
  ): Promise<void> {
    await Promise.all([
      this.invalidateQuest(contractId, questId),
      this.invalidateUserStats(contractId, submitterAddress),
    ]);
    this.recordInvalidation('contract_write');
  }

  private extractQuestId(topics: unknown[]): string | undefined {
    const candidate = topics[1];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      'toString' in candidate
    ) {
      const asString = String((candidate as { toString(): string }).toString());
      if (asString && asString !== '[object Object]') {
        return asString;
      }
    }
    return undefined;
  }

  private extractUserAddress(topics: unknown[]): string | undefined {
    for (const index of [2, 1]) {
      const candidate = topics[index];
      if (typeof candidate === 'string' && candidate.startsWith('G')) {
        return candidate;
      }
    }
    return undefined;
  }
}
