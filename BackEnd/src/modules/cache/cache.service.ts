import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CacheAnalyticsService } from './cache-analytics.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // In-memory registry of every key we have ever set, so we can
  // implement deletePattern() without needing a Redis SCAN command.
  private readonly keyRegistry = new Set<string>();

  // Optional: local memory store for fallbacks
  private readonly localFallbackStore = new Map<string, { value: any; expiresAt?: number }>();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly analyticsService: CacheAnalyticsService,
  ) {}

  // ─── Core Methods ──────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.analyticsService.recordHit();
        return value;
      }
      
      // Check local fallback
      const fallback = this.localFallbackStore.get(key);
      if (fallback) {
        if (!fallback.expiresAt || fallback.expiresAt > Date.now()) {
          this.logger.debug(`Cache fallback hit for key: ${key}`);
          this.analyticsService.recordHit();
          return fallback.value;
        } else {
          this.localFallbackStore.delete(key);
        }
      }

      this.analyticsService.recordMiss();
      return undefined;
    } catch (e) {
      this.logger.error(`Cache get fallback triggered for key ${key}`, e);
      this.analyticsService.recordError();
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number, tags?: string[]): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.keyRegistry.add(key);
      this.analyticsService.recordSet();

      // Store in fallback just in case redis goes down
      const fallbackMs = ttl ? ttl * 1000 : undefined;
      this.localFallbackStore.set(key, { value, expiresAt: fallbackMs ? Date.now() + fallbackMs : undefined });

      if (tags && tags.length > 0) {
        await Promise.all(tags.map(tag => this.addTagToKey(key, tag)));
      }
    } catch (e) {
      this.logger.error(`Cache set failed for key ${key}`, e);
      this.analyticsService.recordError();
      // Store locally as fallback
      this.keyRegistry.add(key);
      const fallbackMs = ttl ? ttl * 1000 : undefined;
      this.localFallbackStore.set(key, { value, expiresAt: fallbackMs ? Date.now() + fallbackMs : undefined });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.keyRegistry.delete(key);
      this.localFallbackStore.delete(key);
      this.analyticsService.recordDel();
    } catch (e) {
      this.logger.error(`Cache del failed for key ${key}`, e);
      this.analyticsService.recordError();
      this.keyRegistry.delete(key);
      this.localFallbackStore.delete(key);
    }
  }

  async delete(key: string): Promise<void> {
    return this.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const toDelete: string[] = [];

    for (const key of this.keyRegistry) {
      if (key.startsWith(pattern)) {
        toDelete.push(key);
      }
    }

    await Promise.all(toDelete.map((key) => this.del(key)));
    this.logger.debug(`deletePattern("${pattern}") removed ${toDelete.length} key(s)`);
  }

  // ─── Tags Functionality ────────────────────────────────────────────────────

  private async addTagToKey(key: string, tag: string): Promise<void> {
    const tagKey = `cache_tag:${tag}`;
    const mappedKeys = await this.get<string[]>(tagKey) || [];
    if (!mappedKeys.includes(key)) {
      mappedKeys.push(key);
      // Store tag mapping with high TTL
      await this.cacheManager.set(tagKey, mappedKeys, 0); // 0 or long enough
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `cache_tag:${tag}`;
    const keys = await this.get<string[]>(tagKey) || [];
    if (keys.length > 0) {
      await Promise.all(keys.map(k => this.del(k)));
      await this.del(tagKey);
      this.logger.debug(`Invalidated ${keys.length} keys for tag "${tag}"`);
    }
  }

  // ─── Distributed Locking ───────────────────────────────────────────────────

  async acquireLock(key: string, ttlMs: number = 5000): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = uuidv4();

    try {
      const store = this.cacheManager.store as any;
      const client = store.getClient ? store.getClient() : null;
      if (client && typeof client.set === 'function') {
        const result = await client.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
        if (result === 'OK') return lockValue;
        return null;
      }
    } catch (e) {
      this.logger.warn('Redis client not exposed or failed, falling back to memory lock', e);
    }

    // In-memory fallback lock
    if (this.keyRegistry.has(lockKey) || this.localFallbackStore.has(lockKey)) {
      return null;
    }
    
    this.keyRegistry.add(lockKey);
    this.localFallbackStore.set(lockKey, { value: lockValue, expiresAt: Date.now() + ttlMs });
    
    setTimeout(() => {
      this.releaseLock(key, lockValue).catch(() => {});
    }, ttlMs);
    
    return lockValue;
  }

  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    
    try {
      const store = this.cacheManager.store as any;
      const client = store.getClient ? store.getClient() : null;
      if (client && typeof client.eval === 'function') {
        // Lua script to check value and del
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await client.eval(script, 1, lockKey, lockValue);
        return result === 1;
      }
    } catch (e) {
      this.logger.warn('Redis release lock fallback to memory', e);
    }

    // fallback memory release
    const stored = this.localFallbackStore.get(lockKey);
    if (stored && stored.value === lockValue) {
      this.keyRegistry.delete(lockKey);
      this.localFallbackStore.delete(lockKey);
      return true;
    }
    return false;
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  async clear(): Promise<void> {
    try {
      if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
      } else {
        await Promise.all([...this.keyRegistry].map((key) => this.cacheManager.del(key)));
      }
    } catch {
      // Ignored
    }
    this.keyRegistry.clear();
    this.localFallbackStore.clear();
  }

  async getStats(keyPrefix?: string) {
    const analytics = this.analyticsService.getAnalytics();
    const base = {
      ...analytics,
      trackedKeys: this.keyRegistry.size,
    };

    if (keyPrefix) {
      const keys = [...this.keyRegistry].filter((k) => k.startsWith(keyPrefix));
      return { ...base, keys };
    }

    return base;
  }

  resetStats(): void {
    this.analyticsService.resetAnalytics();
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number, prefix?: string, tags?: string[]): Promise<T> {
    const finalKey = prefix ? `${prefix}:${key}` : key;
    const cached = await this.get<T>(finalKey);
    if (cached !== undefined) {
      return cached;
    }
    const result = await fn();
    await this.set(finalKey, result, ttl, tags);
    return result;
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    return this.deletePattern(`${prefix}:`);
  }

  async reset(): Promise<void> {
    return this.clear();
  }
}