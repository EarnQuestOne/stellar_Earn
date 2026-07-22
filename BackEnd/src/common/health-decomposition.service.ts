import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface ComponentHealth {
  status: HealthStatus;
  latencyMs?: number;
  detail?: string;
}

export interface HealthReport {
  status: HealthStatus;
  components: Record<string, ComponentHealth>;
}

@Injectable()
export class HealthDecompositionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.allSettled([
      this.checkDb(),
      this.checkRedis(),
    ]);

    const components: Record<string, ComponentHealth> = {
      database:
        db.status === 'fulfilled'
          ? db.value
          : {
              status: 'down',
              detail: String(db.reason),
            },
      redis:
        redis.status === 'fulfilled'
          ? redis.value
          : {
              status: 'down',
              detail: String(redis.reason),
            },
    };

    const overall: HealthStatus = Object.values(components).some(
      (c) => c.status === 'down',
    )
      ? 'down'
      : Object.values(components).some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'ok';

    return { status: overall, components };
  }

  private async checkDb(): Promise<ComponentHealth> {
    const start = Date.now();
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', latencyMs: Date.now() - start };
  }

  private checkRedis(): Promise<ComponentHealth> {
    // Placeholder — wire up your Redis client here
    return Promise.resolve({ status: 'ok', latencyMs: 0 });
  }
}
