import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private stats = { hits: 0, misses: 0 };

  // In-memory registry of every key we have ever set, so we can
  // implement deletePattern() without needing a Redis SCAN command.
  // cache-manager abstracts the underlying store and does not expose SCAN.
  private readonly keyRegistry = new Set<string>();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // ─── Core Methods ──────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.cacheManager.get<T>(key);
    if (value !== undefined && value !== null) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value ?? undefined;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
    this.keyRegistry.add(key);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
    this.keyRegistry.delete(key);
  }

  /**
   * Alias for del() — used throughout QuestsService and CacheController.
   */
  async delete(key: string): Promise<void> {
    return this.del(key);
  }

  // ─── deletePattern ─────────────────────────────────────────────────────────
  /**
   * Deletes all cached keys whose name starts with `pattern`.
   * Works with any cache-manager store (memory, Redis, etc.) by maintaining
   * an internal key registry on every set() call.
   */
  async deletePattern(pattern: string): Promise<void> {
    const toDelete: string[] = [];

    for (const key of this.keyRegistry) {
      if (key.startsWith(pattern)) {
        toDelete.push(key);
      }
    }

    await Promise.all(toDelete.map((key) => this.del(key)));

    this.logger.debug(
      `deletePattern("${pattern}") removed ${toDelete.length} key(s)`,
    );
  }

  // ─── clear ─────────────────────────────────────────────────────────────────
  /**
   * Clears the entire cache. Falls back to deleting all tracked keys
   * if the underlying store does not expose reset().
   */
  async clear(): Promise<void> {
    if (typeof (this.cacheManager as any).reset === 'function') {
      await (this.cacheManager as any).reset();
      this.keyRegistry.clear();
      return;
    }

    // Fallback: delete every key we have registered
    await Promise.all(
      [...this.keyRegistry].map((key) => this.cacheManager.del(key)),
    );
    this.keyRegistry.clear();
  }

  // ─── getStats ──────────────────────────────────────────────────────────────
  /**
   * Returns hit/miss counters.
   * If `keyPrefix` is provided, also returns all tracked keys matching that prefix.
   */
  async getStats(keyPrefix?: string): Promise<{
    hits: number;
    misses: number;
    trackedKeys: number;
    keys?: string[];
  }> {
    const base = {
      hits: this.stats.hits,
      misses: this.stats.misses,
      trackedKeys: this.keyRegistry.size,
    };

    if (keyPrefix) {
      const keys = [...this.keyRegistry].filter((k) => k.startsWith(keyPrefix));
      return { ...base, keys };
    }

    return base;
  }

  // ─── resetStats ────────────────────────────────────────────────────────────
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  async reset(): Promise<void> {
    return this.clear();
  }
}