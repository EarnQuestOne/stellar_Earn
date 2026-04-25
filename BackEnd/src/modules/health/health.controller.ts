import { Controller, Get, Header, Res } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DatabaseIndicator } from './indicators/database.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
import { MetricsService } from '../../common/services/metrics.service';
import { SkipLogging } from '../../common/interceptors/logging.interceptor';
import { DatabasePoolMonitorService } from './services/database-pool-monitor.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseIndicator,
    private readonly redis: RedisIndicator,
    private readonly metrics: MetricsService,
    private readonly poolMonitor: DatabasePoolMonitorService,
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

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed system metrics snapshot (JSON)' })
  @ApiResponse({ status: 200, description: 'Full metrics snapshot' })
  detailed() {
    return this.metrics.getSnapshot();
  }

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

  @Get('pool')
  @ApiOperation({ summary: 'Database connection pool statistics' })
  @ApiResponse({ status: 200, description: 'Pool statistics' })
  poolStats() {
    return {
      stats: this.poolMonitor.getPoolStats(),
      config: this.poolMonitor.getPoolConfig(),
      utilization: this.poolMonitor.getUtilizationPercentage(),
      averageAcquisitionTime: this.poolMonitor.getAverageAcquisitionTime(),
    };
  }
}