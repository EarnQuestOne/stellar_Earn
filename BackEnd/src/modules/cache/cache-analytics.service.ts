import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheAnalyticsService {
  private readonly logger = new Logger(CacheAnalyticsService.name);
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
  }

  recordMiss(): void {
    this.analytics.misses++;
    this.analytics.operations.get++;
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
    return this.analytics;
  }

  resetAnalytics(): void {
    this.analytics = {
      hits: 0,
      misses: 0,
      operations: {
        get: 0,
        set: 0,
        del: 0,
      },
      errors: 0,
    };
    this.logger.log('Cache analytics have been reset');
  }
}
