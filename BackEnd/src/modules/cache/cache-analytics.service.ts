import { Injectable, Logger } from '@nestjs/common';

export interface CacheHitRateAlert {
  triggered: boolean;
  currentRate: number;
  targetRate: number;
  alertThreshold: number;
  message: string;
}

@Injectable()
export class CacheAnalyticsService {
  private readonly logger = new Logger(CacheAnalyticsService.name);

  /** Minimum acceptable hit-rate (0–1). Alert fires below this value. */
  static readonly HIT_RATE_TARGET = 0.8;

  /** Alert threshold: fires when hit-rate drops this far below the target. */
  static readonly HIT_RATE_ALERT_THRESHOLD = 0.7;

  private analytics = {
    hits: 0,
    misses: 0,
    operations: {
      get: 0,
      set: 0,
      del: 0,
    },
    errors: 0,
  };

  recordHit(): void {
    this.analytics.hits++;
    this.analytics.operations.get++;
    this.checkHitRateAlert();
  }

  recordMiss(): void {
    this.analytics.misses++;
    this.analytics.operations.get++;
    this.checkHitRateAlert();
  }

  recordSet(): void {
    this.analytics.operations.set++;
  }

  recordDel(): void {
    this.analytics.operations.del++;
  }

  recordError(): void {
    this.analytics.errors++;
  }

  getAnalytics() {
    return {
      ...this.analytics,
      hitRate: this.getHitRate(),
      hitRateTarget: CacheAnalyticsService.HIT_RATE_TARGET,
      alertThreshold: CacheAnalyticsService.HIT_RATE_ALERT_THRESHOLD,
    };
  }

  /** Returns the current hit-rate as a value between 0 and 1. */
  getHitRate(): number {
    const total = this.analytics.hits + this.analytics.misses;
    if (total === 0) return 1;
    return this.analytics.hits / total;
  }

  /** Returns alert status against the configured target and threshold. */
  getHitRateAlert(): CacheHitRateAlert {
    const currentRate = this.getHitRate();
    const triggered =
      currentRate < CacheAnalyticsService.HIT_RATE_ALERT_THRESHOLD;
    return {
      triggered,
      currentRate,
      targetRate: CacheAnalyticsService.HIT_RATE_TARGET,
      alertThreshold: CacheAnalyticsService.HIT_RATE_ALERT_THRESHOLD,
      message: triggered
        ? `Cache hit-rate ${(currentRate * 100).toFixed(1)}% is below alert threshold ${(CacheAnalyticsService.HIT_RATE_ALERT_THRESHOLD * 100).toFixed(1)}% (target: ${(CacheAnalyticsService.HIT_RATE_TARGET * 100).toFixed(1)}%)`
        : `Cache hit-rate ${(currentRate * 100).toFixed(1)}% is within acceptable range`,
    };
  }

  resetAnalytics(): void {
    this.analytics = {
      hits: 0,
      misses: 0,
      operations: { get: 0, set: 0, del: 0 },
      errors: 0,
    };
    this.logger.log('Cache analytics have been reset');
  }

  private checkHitRateAlert(): void {
    // Only evaluate after a minimum sample size to avoid noise
    const total = this.analytics.hits + this.analytics.misses;
    if (total < 10) return;

    const alert = this.getHitRateAlert();
    if (alert.triggered) {
      this.logger.warn(`[CACHE ALERT] ${alert.message}`);
    }
  }
}
