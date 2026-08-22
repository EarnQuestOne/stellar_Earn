import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { redisKey } from '../../cache/cache-keys';
import { JobStatus } from '../job.types';
import { PayoutStatus } from '../../payouts/entities/payout.entity';
import type { PayoutResponseDto } from '../../payouts/dto/payout-query.dto';

/** Snapshot served to payout status pollers without hitting Postgres. */
export interface JobResultStatusSnapshot {
  status: string;
  result?: Record<string, unknown> | null;
  payout?: PayoutResponseDto;
  cachedAt: string;
}

const TERMINAL_JOB_STATUSES = new Set<string>([
  JobStatus.COMPLETED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
]);

const TERMINAL_PAYOUT_STATUSES = new Set<string>([
  PayoutStatus.COMPLETED,
  PayoutStatus.FAILED,
  PayoutStatus.DEAD_LETTER,
]);

@Injectable()
export class JobResultStatusCacheService {
  private readonly logger = new Logger(JobResultStatusCacheService.name);

  private readonly inProgressTtlSeconds: number;
  private readonly terminalTtlSeconds: number;

  private pollHits = 0;
  private pollMisses = 0;
  private dbReadsAvoided = 0;

  constructor(
    private readonly cacheService: CacheService,
    configService: ConfigService,
  ) {
    this.inProgressTtlSeconds = configService.get<number>(
      'PAYOUT_STATUS_CACHE_TTL_IN_PROGRESS_SEC',
      5,
    );
    this.terminalTtlSeconds = configService.get<number>(
      'PAYOUT_STATUS_CACHE_TTL_TERMINAL_SEC',
      30,
    );
  }

  buildPayoutPollKey(payoutId: string, viewerScope: string): string {
    return redisKey('payout_poll', payoutId, viewerScope);
  }

  buildJobStatusKey(jobId: string): string {
    return redisKey('job_status', jobId);
  }

  resolveTtlSeconds(status: string): number {
    if (
      TERMINAL_JOB_STATUSES.has(status) ||
      TERMINAL_PAYOUT_STATUSES.has(status)
    ) {
      return this.terminalTtlSeconds;
    }
    return this.inProgressTtlSeconds;
  }

  async getPayoutPoll(
    payoutId: string,
    viewerScope: string,
  ): Promise<PayoutResponseDto | undefined> {
    const key = this.buildPayoutPollKey(payoutId, viewerScope);
    const snapshot = await this.cacheService.get<JobResultStatusSnapshot>(key);
    if (!snapshot?.payout) {
      this.pollMisses += 1;
      return undefined;
    }
    this.pollHits += 1;
    this.dbReadsAvoided += 1;
    return snapshot.payout;
  }

  async setPayoutPoll(
    payoutId: string,
    viewerScope: string,
    payout: PayoutResponseDto,
  ): Promise<void> {
    const key = this.buildPayoutPollKey(payoutId, viewerScope);
    const snapshot: JobResultStatusSnapshot = {
      status: payout.status,
      payout,
      cachedAt: new Date().toISOString(),
    };
    const ttl = this.resolveTtlSeconds(payout.status);
    await this.cacheService.set(key, snapshot, ttl);
    this.logger.debug(
      `Cached payout poll ${payoutId} (${viewerScope}) ttl=${ttl}s status=${payout.status}`,
    );
  }

  async setJobStatus(
    jobId: string,
    status: string,
    result?: Record<string, unknown> | null,
  ): Promise<void> {
    const key = this.buildJobStatusKey(jobId);
    const snapshot: JobResultStatusSnapshot = {
      status,
      result: result ?? null,
      cachedAt: new Date().toISOString(),
    };
    const ttl = this.resolveTtlSeconds(status);
    await this.cacheService.set(key, snapshot, ttl);
  }

  async getJobStatus(
    jobId: string,
  ): Promise<JobResultStatusSnapshot | undefined> {
    const key = this.buildJobStatusKey(jobId);
    const snapshot = await this.cacheService.get<JobResultStatusSnapshot>(key);
    if (snapshot) {
      this.pollHits += 1;
      this.dbReadsAvoided += 1;
      return snapshot;
    }
    this.pollMisses += 1;
    return undefined;
  }

  async invalidatePayout(payoutId: string): Promise<void> {
    const prefix = redisKey('payout_poll', payoutId);
    await this.cacheService.deletePattern(prefix);
  }

  async invalidateJob(jobId: string): Promise<void> {
    await this.cacheService.del(this.buildJobStatusKey(jobId));
  }

  /** In-process counters for benchmarks and the metrics endpoint. */
  getPollMetrics(): {
    hits: number;
    misses: number;
    dbReadsAvoided: number;
    hitRate: number;
  } {
    const total = this.pollHits + this.pollMisses;
    return {
      hits: this.pollHits,
      misses: this.pollMisses,
      dbReadsAvoided: this.dbReadsAvoided,
      hitRate: total === 0 ? 1 : this.pollHits / total,
    };
  }

  resetPollMetrics(): void {
    this.pollHits = 0;
    this.pollMisses = 0;
    this.dbReadsAvoided = 0;
  }
}
