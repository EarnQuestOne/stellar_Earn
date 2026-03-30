import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CacheService } from '../cache.service';

@Injectable()
export class CacheWarmingStrategy implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheWarmingStrategy.name);
  private warmUpTasks: Array<() => Promise<void>> = [];

  constructor(private readonly cacheService: CacheService) {}

  registerWarmUpTask(task: () => Promise<void>) {
    this.warmUpTasks.push(task);
  }

  async onApplicationBootstrap() {
    if (this.warmUpTasks.length > 0) {
      this.logger.log(`Starting cache warming with ${this.warmUpTasks.length} tasks...`);
      for (const [index, task] of this.warmUpTasks.entries()) {
        try {
          await task();
          this.logger.log(`Cache warming task ${index + 1} completed`);
        } catch (e) {
          this.logger.error(`Cache warming task ${index + 1} failed`, e);
        }
      }
    }
  }

  async warmKey<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
    tags?: string[],
  ): Promise<void> {
    try {
      const data = await fetchFn();
      if (data !== undefined && data !== null) {
        await this.cacheService.set(key, data, ttl, tags);
        this.logger.debug(`Cache warmed for key: ${key}`);
      }
    } catch (e) {
      this.logger.error(`Failed to warm cache for key: ${key}`, e);
    }
  }
}
