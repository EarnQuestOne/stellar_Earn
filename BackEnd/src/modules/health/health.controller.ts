import { Controller, Get, Logger, Res, Version } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipLogging } from '../../common/interceptors/logging.interceptor';
import { DatabaseHealthService } from './services/database-health.service';
import { CacheHealthService } from './services/cache-health.service';
import { ExternalHealthService } from './services/external-health.service';
import { MetricsService } from '../../common/services/metrics.service';
import {
  LiveHealthResponse,
  ReadyHealthResponse,
  DeepHealthResponse,
  ServiceHealth,
  HealthCheckResult,
  ServiceStatus,
} from './types/health.types';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly dbHealth: DatabaseHealthService,
    private readonly cacheHealth: CacheHealthService,
    private readonly externalHealth: ExternalHealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('live')
  @Version('1')
  @SkipLogging()
  @ApiOperation({ summary: 'Liveness probe — 200 while the process is alive' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live(): LiveHealthResponse {
    this.logger.debug('Liveness check');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  // Backwards compatibility: /health maps to deep health check
  @Get()
  @Version('1')
  @SkipLogging()
  @ApiOperation({
    summary: 'Health check (legacy) — alias for /health/deep',
    description:
      'This endpoint is deprecated. Use /health/deep for full diagnostics.',
  })
  async root(
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeepHealthResponse> {
    this.logger.debug('Legacy health check (/) - collecting dependency status');

    const [dbResult, cacheResult, externalResult] = await Promise.all([
      this.dbHealth.check(),
      this.cacheHealth.check(),
      this.externalHealth.check(),
    ]);

    const services = {
      database: this.mapServiceHealth(dbResult),
      cache: this.mapServiceHealth(cacheResult),
      external: this.mapServiceHealth(externalResult),
    };

    const overallStatus = this.calculateLegacyOverallStatus([
      dbResult,
      cacheResult,
      externalResult,
    ]);

    res.status(overallStatus === 'down' ? 503 : 200);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('stellar')
  @Version('1')
  @SkipLogging()
  @ApiOperation({
    summary: 'Stellar Horizon health check',
    description:
      'Checks that the configured Stellar Horizon endpoint is reachable and responding.',
  })
  @ApiResponse({ status: 200, description: 'Stellar Horizon is healthy' })
  @ApiResponse({ status: 503, description: 'Stellar Horizon is unreachable' })
  async stellar(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: ServiceStatus; timestamp: string; service: ServiceHealth }> {
    const result = await this.externalHealth.checkStellar();
    res.status(result.status === 'down' ? 503 : 200);

    return {
      status: result.status,
      timestamp: new Date().toISOString(),
      service: this.mapServiceHealth(result),
    };
  }

  @Get('redis')
  @Version('1')
  @SkipLogging()
  @ApiOperation({
    summary: 'Redis health check',
    description: 'Checks that the Redis cache backend is reachable.',
  })
  @ApiResponse({ status: 200, description: 'Redis is healthy' })
  @ApiResponse({ status: 503, description: 'Redis is unreachable' })
  async redis(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: ServiceStatus; timestamp: string; service: ServiceHealth }> {
    const result = await this.cacheHealth.check();
    res.status(result.status === 'down' ? 503 : 200);

    return {
      status: result.status,
      timestamp: new Date().toISOString(),
      service: this.mapServiceHealth(result),
    };
  }

  @Get('ready')
  @Version('1')
  @SkipLogging()
  @ApiOperation({
    summary:
      'Readiness probe — returns 200 when ready to serve traffic (database + cache)',
    description:
      'Checks database and cache connectivity. Returns 503 if any critical dependency is down.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready - critical dependencies are down',
  })
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadyHealthResponse> {
    this.logger.debug('Readiness check starting');

    // Run database and cache checks in parallel
    const [dbResult, cacheResult] = await Promise.all([
      this.dbHealth.check(),
      this.cacheHealth.check(),
    ]);

    const services = {
      database: this.mapServiceHealth(dbResult),
      cache: this.mapServiceHealth(cacheResult),
    };

    const overallStatus = this.calculateOverallStatus([dbResult, cacheResult]);

    // Set HTTP status code based on overall status
    res.status(overallStatus === 'down' ? 503 : 200);

    this.logger.debug(`Readiness check complete: status=${overallStatus}`, {
      dbLatency: dbResult.latency,
      cacheLatency: cacheResult.latency,
    });

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('deep')
  @Version('1')
  @SkipLogging()
  @ApiOperation({
    summary:
      'Deep health diagnostics — full system check (database + cache + external)',
    description:
      'Performs comprehensive health checks on all critical dependencies including external services. ' +
      'Returns 503 if any service is down, 200 otherwise.',
  })
  @ApiResponse({
    status: 200,
    description: 'All systems operational or degraded',
  })
  @ApiResponse({
    status: 503,
    description: 'One or more critical services are down',
  })
  async deep(
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeepHealthResponse> {
    this.logger.debug('Deep health check starting');

    // Run all checks in parallel
    const [dbResult, cacheResult, externalResult] = await Promise.all([
      this.dbHealth.check(),
      this.cacheHealth.check(),
      this.externalHealth.check(),
    ]);

    const services = {
      database: this.mapServiceHealth(dbResult),
      cache: this.mapServiceHealth(cacheResult),
      external: this.mapServiceHealth(externalResult),
    };

    const overallStatus = this.calculateOverallStatus([
      dbResult,
      cacheResult,
      externalResult,
    ]);

    // Set HTTP status code based on overall status
    res.status(overallStatus === 'down' ? 503 : 200);

    this.logger.debug(`Deep health check complete: status=${overallStatus}`, {
      dbLatency: dbResult.latency,
      cacheLatency: cacheResult.latency,
      externalLatency: externalResult.latency,
    });

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('metrics')
  @Version('1')
  @SkipLogging()
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description:
      'Returns application metrics in Prometheus text exposition format for scraping by Prometheus/Grafana.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example:
            '# HELP http_requests_total Total HTTP requests received\n# TYPE http_requests_total counter\nhttp_requests_total 1234',
        },
      },
    },
  })
  metrics(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(this.metricsService.getPrometheusOutput());
  }

  private mapServiceHealth(result: HealthCheckResult): ServiceHealth {
    return {
      status: result.status,
      latency: result.latency,
      ...(result.error ? { error: result.error } : {}),
    };
  }

  private calculateOverallStatus(results: HealthCheckResult[]): ServiceStatus {
    if (results.some((r) => r.status === 'down')) {
      return 'down';
    }
    if (results.some((r) => r.status === 'degraded')) {
      return 'degraded';
    }
    return 'ok';
  }

  private calculateLegacyOverallStatus(
    results: HealthCheckResult[],
  ): ServiceStatus {
    const [databaseResult, cacheResult, externalResult] = results;

    if (
      databaseResult?.status === 'down' ||
      cacheResult?.status === 'down'
    ) {
      return 'down';
    }

    if (externalResult?.status === 'down') {
      return 'degraded';
    }

    return this.calculateOverallStatus(results);
  }
}
