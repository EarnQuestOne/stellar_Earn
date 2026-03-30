import { Controller, Get, Header, Res } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiVersion } from '../../common/decorators/api-version.decorator';
import { Response } from 'express';
import { DatabaseIndicator } from './indicators/database.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
import { MetricsService } from '../../common/services/metrics.service';
import { SkipLogging } from '../../common/interceptors/logging.interceptor';

@ApiTags('Health')
@Controller('health')
@ApiVersion(['1', '2'], {
  deprecated: false,
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseIndicator,
    private readonly redis: RedisIndicator,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full system health status' })
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe — returns 200 when ready to serve traffic',
  })
  ready() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Liveness probe — always returns 200 as long as the process is running.
   * Does NOT check downstream dependencies, so it never blocks a restart loop.
   */
  @Get('live')
  @SkipLogging()
  @ApiOperation({ summary: 'Liveness probe — 200 while the process is alive' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * Detailed system snapshot: memory, uptime, and all collected in-process
   * metrics in a structured JSON format suitable for a monitoring dashboard.
   */
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed system metrics snapshot (JSON)' })
  @ApiResponse({ status: 200, description: 'Full metrics snapshot' })
  detailed() {
    return this.metrics.getSnapshot();
  }

  /**
   * Prometheus text-format metrics endpoint.
   * Compatible with Prometheus scrape configs and Grafana data sources.
   *
   * Scrape config example:
   *   scrape_configs:
   *     - job_name: stellar_earn
   *       static_configs:
   *         - targets: ['host:3001']
   *       metrics_path: /api/v1/health/metrics
   */
  @Get('metrics')
  @SkipLogging()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus-format metrics for scraping' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus text exposition format',
    content: { 'text/plain': {} },
  })
  prometheusMetrics(@Res() res: Response) {
    res.send(this.metrics.getPrometheusOutput());
  }
}
