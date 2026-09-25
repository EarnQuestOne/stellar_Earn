import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { MetricsService } from '../../common/services/metrics.service';
import { SorobanRpcClientPoolService } from './soroban-rpc-client-pool.service';

/**
 * Precomputes and caches Stellar network fee estimates.
 *
 * Querying fee statistics from Horizon on every transaction adds a network
 * round-trip to the payout hot path. This service instead fetches the fee
 * stats in the background (on startup and on a short cron), serves the
 * cached `last_ledger_base_fee` to callers, and only falls back to a
 * synchronous network fetch when no cached value exists yet.
 *
 * Behaviour:
 *  - A short TTL (`STELLAR_FEE_CACHE_TTL_MS`, default 30s) bounds staleness.
 *  - A background cron refreshes the estimate every 30 seconds, so payout
 *    transactions almost always hit a warm cache.
 *  - Stale-but-present values are served immediately while a background
 *    refresh is triggered, keeping the hot path latency-free.
 *  - Failed fetches keep serving the last known value; the configured
 *    `STELLAR_BASE_FEE` (default 100 stroops) is only used before the first
 *    successful fetch.
 *  - Metrics expose the cached fee, cache age, fetch duration, and
 *    hit/miss/failure counters for before/after impact tracking.
 */
@Injectable()
export class StellarFeeService implements OnModuleInit {
  private readonly logger = new Logger(StellarFeeService.name);

  private cachedFeeInStroops: number | null = null;
  private lastFetchedAt = 0;
  private lastFetchDurationMs = 0;
  private inFlightRefresh: Promise<number> | null = null;

  private readonly ttlMs: number;
  private readonly fallbackFeeInStroops: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly clientPool: SorobanRpcClientPoolService,
    private readonly metrics: MetricsService,
  ) {
    const configuredTtl = this.configService.get<string>(
      'STELLAR_FEE_CACHE_TTL_MS',
    );
    this.ttlMs = configuredTtl ? parseInt(configuredTtl, 10) : 30_000;
    this.fallbackFeeInStroops = parseInt(
      this.configService.get<string>('STELLAR_BASE_FEE') || '100',
      10,
    );
  }

  onModuleInit(): void {
    this.metrics.registerGauge(
      'stellar_fee_estimate_stroops',
      'Cached network base fee in stroops',
    );
    this.metrics.registerGauge(
      'stellar_fee_cache_age_ms',
      'Age of the cached fee estimate in milliseconds',
    );
    this.metrics.registerGauge(
      'stellar_fee_fetch_duration_ms',
      'Duration of the most recent fee-stats fetch in milliseconds',
    );
    this.metrics.registerCounter(
      'stellar_fee_cache_hits_total',
      'Fee-estimate reads served from the cache',
    );
    this.metrics.registerCounter(
      'stellar_fee_cache_misses_total',
      'Fee-estimate reads that required a network fetch or refresh trigger',
    );
    this.metrics.registerCounter(
      'stellar_fee_fetch_failures_total',
      'Failed fee-stats network fetches',
    );

    // Warm the cache in the background on startup so the first payout does
    // not pay the network round-trip.
    void this.refreshFeeEstimate();
  }

  /**
   * Returns the recommended network base fee in stroops, served from the
   * cache. A background refresh is kicked off whenever the cached value is
   * stale, so callers never block on the network.
   */
  async getBaseFeeInStroops(): Promise<number> {
    const now = Date.now();

    if (this.cachedFeeInStroops !== null) {
      if (now - this.lastFetchedAt < this.ttlMs) {
        this.metrics.incrementCounter('stellar_fee_cache_hits_total');
      } else {
        // Stale but available: serve it and refresh in the background.
        this.metrics.incrementCounter('stellar_fee_cache_misses_total');
        void this.refreshFeeEstimate();
      }
      this.metrics.setGauge(
        'stellar_fee_cache_age_ms',
        now - this.lastFetchedAt,
      );
      return this.cachedFeeInStroops;
    }

    // No cached value yet — a synchronous fetch is unavoidable the first
    // time, after which the background refresh keeps the cache warm.
    this.metrics.incrementCounter('stellar_fee_cache_misses_total');
    return this.refreshFeeEstimate();
  }

  /**
   * Background refresh of the cached fee estimate. Single-flighted so a burst
   * of callers never triggers more than one network fetch at a time.
   */
  @Cron('*/30 * * * * *')
  async refreshFeeEstimate(): Promise<number> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    this.inFlightRefresh = this.doRefresh().finally(() => {
      this.inFlightRefresh = null;
    });
    return this.inFlightRefresh;
  }

  private async doRefresh(): Promise<number> {
    const startedAt = Date.now();

    try {
      const stats = await this.clientPool.getHorizonServer().feeStats();
      const networkBaseFee = Number.parseInt(stats.last_ledger_base_fee, 10);
      const fee =
        Number.isFinite(networkBaseFee) && networkBaseFee > 0
          ? networkBaseFee
          : this.fallbackFeeInStroops;

      this.cachedFeeInStroops = fee;
      this.lastFetchedAt = Date.now();
      this.lastFetchDurationMs = Date.now() - startedAt;

      this.metrics.setGauge('stellar_fee_estimate_stroops', fee);
      this.metrics.setGauge(
        'stellar_fee_fetch_duration_ms',
        this.lastFetchDurationMs,
      );
      this.metrics.setGauge('stellar_fee_cache_age_ms', 0);

      this.logger.debug(`Refreshed network fee estimate: ${fee} stroops`);
      return fee;
    } catch (error) {
      this.metrics.incrementCounter('stellar_fee_fetch_failures_total');
      this.metrics.setGauge(
        'stellar_fee_fetch_duration_ms',
        Date.now() - startedAt,
      );

      const servedFee = this.cachedFeeInStroops ?? this.fallbackFeeInStroops;
      this.logger.warn(
        `Failed to refresh fee estimate (${(error as Error).message}); serving ${servedFee} stroops`,
      );
      return servedFee;
    }
  }
}
