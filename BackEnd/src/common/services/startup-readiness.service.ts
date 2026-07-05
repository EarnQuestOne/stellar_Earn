import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

export interface ReadinessCheckResult {
  component: string;
  status: 'ok' | 'degraded' | 'down';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface StartupReadinessReport {
  timestamp: string;
  environment: string;
  overallStatus: 'ready' | 'degraded' | 'not_ready';
  checks: ReadinessCheckResult[];
  totalDurationMs: number;
}

@Injectable()
export class StartupReadinessService implements OnModuleInit {
  private readonly logger = new Logger(StartupReadinessService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.runStartupReadinessCheck();
  }

  async runStartupReadinessCheck(): Promise<StartupReadinessReport> {
    const startTime = Date.now();
    this.logger.log('🚀 Starting startup readiness checklist...');

    const checks: ReadinessCheckResult[] = [];

    // Check 1: Environment Variables (Keys)
    checks.push(await this.checkEnvironmentVariables());

    // Check 2: Database
    checks.push(await this.checkDatabase());

    // Check 3: Redis/Cache
    checks.push(await this.checkCache());

    // Check 4: Queue (Redis connection for BullMQ)
    checks.push(await this.checkQueue());

    const totalDurationMs = Date.now() - startTime;
    const overallStatus = this.calculateOverallStatus(checks);

    const report: StartupReadinessReport = {
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV') || 'development',
      overallStatus,
      checks,
      totalDurationMs,
    };

    this.logReadinessReport(report);

    // If not ready, throw error to prevent startup
    if (overallStatus === 'not_ready') {
      const criticalFailures = checks
        .filter((c) => c.status === 'down')
        .map((c) => `${c.component}: ${c.error}`)
        .join(', ');
      throw new Error(
        `Startup readiness check failed. Critical dependencies unavailable: ${criticalFailures}`,
      );
    }

    return report;
  }

  private async checkEnvironmentVariables(): Promise<ReadinessCheckResult> {
    const startTime = Date.now();
    const requiredKeys = ['DATABASE_URL', 'JWT_SECRET'];
    const optionalKeys = ['REDIS_URL', 'STELLAR_NETWORK_PASSPHRASE'];

    try {
      const missing: string[] = [];
      const warnings: string[] = [];

      for (const key of requiredKeys) {
        if (!process.env[key]) {
          missing.push(key);
        }
      }

      for (const key of optionalKeys) {
        if (!process.env[key]) {
          warnings.push(key);
        }
      }

      const latency = Date.now() - startTime;

      if (missing.length > 0) {
        return {
          component: 'Environment Variables (Keys)',
          status: 'down',
          latency,
          error: `Missing required keys: ${missing.join(', ')}`,
          details: { missing, warnings },
        };
      }

      if (warnings.length > 0) {
        return {
          component: 'Environment Variables (Keys)',
          status: 'degraded',
          latency,
          error: `Missing optional keys: ${warnings.join(', ')}`,
          details: { warnings },
        };
      }

      return {
        component: 'Environment Variables (Keys)',
        status: 'ok',
        latency,
        details: {
          requiredKeys: requiredKeys.length,
          optionalKeys: optionalKeys.length,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        component: 'Environment Variables (Keys)',
        status: 'down',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkDatabase(): Promise<ReadinessCheckResult> {
    const startTime = Date.now();
    const timeoutMs = 5000;

    try {
      const result = await Promise.race([
        this.dataSource.query('SELECT 1'),
        this.timeoutPromise(timeoutMs),
      ]);

      if (result === null) {
        const latency = Date.now() - startTime;
        return {
          component: 'Database (PostgreSQL)',
          status: 'down',
          latency,
          error: `Connection timeout after ${timeoutMs}ms`,
        };
      }

      const latency = Date.now() - startTime;
      return {
        component: 'Database (PostgreSQL)',
        status: 'ok',
        latency,
        details: { query: 'SELECT 1' },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        component: 'Database (PostgreSQL)',
        status: 'down',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkCache(): Promise<ReadinessCheckResult> {
    const startTime = Date.now();
    const timeoutMs = 3000;

    try {
      const client = await this.getRedisClient();

      if (!client) {
        const latency = Date.now() - startTime;
        return {
          component: 'Redis/Cache',
          status: 'degraded',
          latency,
          error: 'Redis client not available (using memory store)',
        };
      }

      const result = await Promise.race([
        client.ping ? client.ping() : Promise.resolve('PONG'),
        this.timeoutPromise(timeoutMs),
      ]);

      if (result === null) {
        const latency = Date.now() - startTime;
        return {
          component: 'Redis/Cache',
          status: 'degraded',
          latency,
          error: `Ping timeout after ${timeoutMs}ms`,
        };
      }

      const latency = Date.now() - startTime;
      return {
        component: 'Redis/Cache',
        status: 'ok',
        latency,
        details: { ping: result },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        component: 'Redis/Cache',
        status: 'degraded',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkQueue(): Promise<ReadinessCheckResult> {
    const startTime = Date.now();
    const timeoutMs = 3000;

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

      // Try to connect to Redis to verify queue backend
      const client = await this.getRedisClient();

      if (!client) {
        const latency = Date.now() - startTime;
        return {
          component: 'Queue (BullMQ)',
          status: 'degraded',
          latency,
          error: 'Redis client not available for queue operations',
          details: { redisUrl },
        };
      }

      const result = await Promise.race([
        client.ping ? client.ping() : Promise.resolve('PONG'),
        this.timeoutPromise(timeoutMs),
      ]);

      if (result === null) {
        const latency = Date.now() - startTime;
        return {
          component: 'Queue (BullMQ)',
          status: 'degraded',
          latency,
          error: `Queue backend timeout after ${timeoutMs}ms`,
          details: { redisUrl },
        };
      }

      const latency = Date.now() - startTime;
      return {
        component: 'Queue (BullMQ)',
        status: 'ok',
        latency,
        details: { redisUrl, backend: 'Redis' },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        component: 'Queue (BullMQ)',
        status: 'degraded',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getRedisClient(): any {
    try {
      const store =
        (this.cacheManager as any).stores?.[0] ??
        (this.cacheManager as any).store;
      const client = store?.getClient
        ? store.getClient()
        : store?.client
          ? store.client
          : null;

      if (client && typeof client.ping === 'function') {
        return client;
      }
    } catch (_e) {
      // Ignore errors
    }

    return null;
  }

  private timeoutPromise(ms: number): Promise<null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), ms);
    });
  }

  private calculateOverallStatus(
    checks: ReadinessCheckResult[],
  ): 'ready' | 'degraded' | 'not_ready' {
    const hasDown = checks.some((c) => c.status === 'down');
    const hasDegraded = checks.some((c) => c.status === 'degraded');

    if (hasDown) {
      return 'not_ready';
    }

    if (hasDegraded) {
      return 'degraded';
    }

    return 'ready';
  }

  private logReadinessReport(report: StartupReadinessReport): void {
    const statusEmoji =
      report.overallStatus === 'ready'
        ? '✅'
        : report.overallStatus === 'degraded'
          ? '⚠️'
          : '❌';

    this.logger.log(
      `${statusEmoji} Startup Readiness Check Complete`,
      'StartupReadiness',
    );

    this.logger.log(
      `Overall Status: ${report.overallStatus.toUpperCase()} (${report.totalDurationMs}ms)`,
      'StartupReadiness',
    );

    for (const check of report.checks) {
      const emoji =
        check.status === 'ok'
          ? '✅'
          : check.status === 'degraded'
            ? '⚠️'
            : '❌';
      const latency = check.latency ? `${check.latency}ms` : 'N/A';
      const error = check.error ? ` - ${check.error}` : '';

      this.logger.log(
        `${emoji} ${check.component}: ${check.status.toUpperCase()} (${latency})${error}`,
        'StartupReadiness',
      );
    }

    if (report.overallStatus === 'ready') {
      this.logger.log(
        '🎉 All critical dependencies are ready. Application is starting up.',
        'StartupReadiness',
      );
    } else if (report.overallStatus === 'degraded') {
      this.logger.warn(
        '⚠️ Application is starting in degraded mode. Some non-critical dependencies are unavailable.',
        'StartupReadiness',
      );
    }
  }
}
