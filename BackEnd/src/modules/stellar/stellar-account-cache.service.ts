import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class StellarAccountCacheService {
  private readonly logger = new Logger(StellarAccountCacheService.name);
  private readonly accountCache = new Map<string, CacheEntry<any>>();
  private readonly trustlineCache = new Map<string, CacheEntry<boolean>>();
  private readonly defaultTtlMs: number;

  private hits = 0;
  private misses = 0;

  constructor(private readonly configService: ConfigService) {
    const configuredTtl = this.configService.get<string>(
      'STELLAR_ACCOUNT_CACHE_TTL_MS',
    );
    this.defaultTtlMs = configuredTtl ? parseInt(configuredTtl, 10) : 10000;
  }

  async loadAccount<T = any>(
    address: string,
    fetcher: () => Promise<T>,
    ttlMs: number = this.defaultTtlMs,
  ): Promise<T> {
    const now = Date.now();
    const entry = this.accountCache.get(address);

    if (entry && entry.expiresAt > now) {
      this.hits++;
      return entry.value;
    }

    this.misses++;
    const value = await fetcher();
    this.accountCache.set(address, {
      value,
      expiresAt: now + ttlMs,
    });

    return value;
  }

  async hasTrustline(
    address: string,
    assetCode: string,
    fetcher: () => Promise<boolean>,
    ttlMs: number = this.defaultTtlMs,
  ): Promise<boolean> {
    const now = Date.now();
    const key = `${address}:${assetCode}`;
    const entry = this.trustlineCache.get(key);

    if (entry && entry.expiresAt > now) {
      this.hits++;
      return entry.value;
    }

    this.misses++;
    const value = await fetcher();
    this.trustlineCache.set(key, {
      value,
      expiresAt: now + ttlMs,
    });

    return value;
  }

  invalidateAccount(address: string): void {
    this.accountCache.delete(address);
    for (const key of this.trustlineCache.keys()) {
      if (key.startsWith(`${address}:`)) {
        this.trustlineCache.delete(key);
      }
    }
  }

  clear(): void {
    this.accountCache.clear();
    this.trustlineCache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getMetrics() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      total,
      hitRatio: total > 0 ? this.hits / total : 0,
    };
  }
}
