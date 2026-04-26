import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HealthCheckResult, ServiceStatus } from '../types/health.types';

const CACHE_TIMEOUT_MS = 3000;
const CACHE_DEGRADED_THRESHOLD_MS = 200;

@Injectable()
export class CacheHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheHealthService.name);
  private redisClient: any = null;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleInit() {
    // Try to get the Redis client early
    await this.getRedisClient();
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (e) {
        // Ignore errors during shutdown
      }
    }
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // If not Redis, mark as skipped/degraded depending on config
      const client = await this.getRedisClient();
      
      if (!client) {
        const latency = Date.now() - startTime;
        return {
          status: 'degraded',
          latency,
          error: 'Cache is not configured (using memory store or Redis unavailable)',
        };
      }

      // Use Promise.race for timeout
      const result = await Promise.race([
        this.pingWithClient(client),
        this.timeoutPromise(CACHE_TIMEOUT_MS),
      ]);

      if (result === null) {
        const latency = Date.now() - startTime;
        this.logger.warn(`Cache health check timed out after ${CACHE_TIMEOUT_MS}ms`);
        return {
          status: 'degraded',
          latency,
          error: `Health check timed out after ${CACHE_TIMEOUT_MS}ms`,
        };
      }

      const latency = Date.now() - startTime;
      
      if (latency > CACHE_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(`Cache health check slow: ${latency}ms (threshold: ${CACHE_DEGRADED_THRESHOLD_MS}ms)`);
        return {
          status: 'degraded',
          latency,
          error: `Response time ${latency}ms exceeds threshold of ${CACHE_DEGRADED_THRESHOLD_MS}ms`,
        };
      }

      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache health check failed: ${errorMessage}`);
      
      return {
        status: 'down',
        latency,
        error: errorMessage,
      };
    }
  }

  private async getRedisClient(): Promise<any> {
    if (this.redisClient) {
      return this.redisClient;
    }

    try {
      const store = (this.cacheManager as any).stores?.[0] ?? (this.cacheManager as any).store;
      const client = store?.getClient ? store.getClient() : store?.client ? store.client : null;
      
      if (client && typeof client.ping === 'function') {
        this.redisClient = client;
        return client;
      }
    } catch (e) {
      this.logger.debug('Could not extract Redis client', e);
    }
    
    return null;
  }

  private async pingWithClient(client: any): Promise<string> {
    const start = process.hrtime.bigint();
    const result = await client.ping();
    const end = process.hrtime.bigint();
    // We don't use the result, but this ensures the ping actually happened
    return result;
  }

  private timeoutPromise(ms: number): Promise<null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), ms);
    });
  }
}
