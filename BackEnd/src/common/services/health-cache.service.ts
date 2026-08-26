import { Injectable, Logger } from '@nestjs/common';

export interface CachedHealthResult {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  [key: string]: any;
}

interface CachedHealthEntry {
  result: CachedHealthResult;
  timestamp: number;
}

/**
 * In-memory cache for health check results.
 * Issue #2031: Avoid running expensive dependency probes on every readiness call.
 *
 * NOT Redis-backed — health checks must work even when Redis is down.
 */
@Injectable()
export class HealthCacheService {
  private readonly logger = new Logger(HealthCacheService.name);
  private readonly cache = new Map<string, CachedHealthEntry>();
  private readonly defaultTtlMs: number;

  constructor() {
    this.defaultTtlMs = parseInt(process.env.HEALTH_CACHE_TTL_MS || '5000', 10);
  }

  /**
   * Get a cached health check result if fresh enough.
   */
  get(key: string, ttlMs?: number): CachedHealthResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const age = Date.now() - entry.timestamp;

    if (age > effectiveTtl) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(
      `Health cache hit for "${key}" (age: ${age}ms, ttl: ${effectiveTtl}ms)`,
    );
    return entry.result;
  }

  /**
   * Store a health check result in cache.
   */
  set(key: string, result: CachedHealthResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached health results (e.g., on explicit refresh).
   */
  clear(): void {
    this.cache.clear();
  }
}
