import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache.service';

@Injectable()
export class CacheAsideStrategy {
  private readonly logger = new Logger(CacheAsideStrategy.name);

  constructor(private readonly cacheService: CacheService) {}

  async fetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
    tags?: string[],
  ): Promise<T> {
    try {
      const cached = await this.cacheService.get<T>(key);
      if (cached !== undefined && cached !== null) {
        this.logger.debug(`Cache Hit Strategy: Cache aside for ${key}`);
        return cached;
      }
    } catch (e) {
      this.logger.error(`Error checking cache for ${key}`, e);
    }

    const data = await fetchFn();

    try {
      if (data !== undefined && data !== null) {
        await this.cacheService.set(key, data, ttl, tags);
      }
    } catch (e) {
      this.logger.error(`Error setting cache for ${key}`, e);
    }

    return data;
  }
}
