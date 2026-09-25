import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';

export interface CachedResult<T> {
  result: T;
  timestamp: number;
}

@Injectable()
export class VerificationDedupService {
  private readonly logger = new Logger(VerificationDedupService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly resultCache = new Map<string, CachedResult<unknown>>();
  private readonly DEFAULT_TTL_MS = 5_000;

  constructor(private readonly metrics: MetricsService) {}

  async executeWithDedup<T>(
    key: string,
    operation: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL_MS,
  ): Promise<T> {
    const cached = this.resultCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      this.metrics.incrementCounter('submission_approval_cache_hits_total', {
        dedup_key: key,
      });
      this.logger.debug(`Cache hit for dedup key=${key}`);
      return cached.result as T;
    }
    this.resultCache.delete(key);

    const inflight = this.inFlight.get(key);
    if (inflight) {
      this.metrics.incrementCounter('submission_approval_dedup_hits_total', {
        dedup_key: key,
      });
      this.logger.debug(`In-flight dedup hit for key=${key}`);
      return inflight as Promise<T>;
    }

    const promise = operation()
      .then((result) => {
        this.resultCache.set(key, { result, timestamp: Date.now() });
        return result;
      })
      .catch((error) => {
        this.resultCache.delete(key);
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(key: string): void {
    this.inFlight.delete(key);
    this.resultCache.delete(key);
  }

  clearAll(): void {
    this.inFlight.clear();
    this.resultCache.clear();
  }

  inflightCount(): number {
    return this.inFlight.size;
  }

  cacheSize(): number {
    return this.resultCache.size;
  }
}
