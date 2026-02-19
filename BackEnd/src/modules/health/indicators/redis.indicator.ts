import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly configService: ConfigService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const cacheType = this.configService.get<string>('CACHE_TYPE', 'memory');

    if (cacheType !== 'redis') {
      return indicator.up({ note: 'skipped (CACHE_TYPE is not redis)' });
    }

    const client = createClient({
      socket: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        connectTimeout: 5000,
      },
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      database: this.configService.get<number>('REDIS_DB', 0),
    });

    try {
      await client.connect();
      await client.ping();
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    } finally {
      await client.disconnect().catch(() => undefined);
    }
  }
}
