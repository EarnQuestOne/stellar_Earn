import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache.service';

@Injectable()
export class WriteThroughStrategy {
  private readonly logger = new Logger(WriteThroughStrategy.name);

  constructor(private readonly cacheService: CacheService) {}

  async write<T>(
    key: string,
    data: T,
    saveFn: (data: T) => Promise<T>,
    ttl?: number,
    tags?: string[],
  ): Promise<T> {
    const savedData = await saveFn(data);
    try {
      await this.cacheService.set(key, savedData, ttl, tags);
      this.logger.debug(`Cache Write-through strategy for ${key}`);
    } catch (e) {
      this.logger.error(`Error updating cache in write-through strategy for ${key}`, e);
    }
    return savedData;
  }
}
