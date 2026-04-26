import { Controller, Get, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipLogging } from '../../common/interceptors/logging.interceptor';
import { DatabaseHealthService } from './services/database-health.service';
import { CacheHealthService } from './services/cache-health.service';
import { ExternalHealthService } from './services/external-health.service';
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
  ) {}

  @Get('live')
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
  @SkipLogging()
  @ApiOperation({ 
    summary: 'Health check (legacy) — alias for /health/deep',
    description: 'This endpoint is deprecated. Use /health/deep for full diagnostics.',
  })
  async root(): Promise<DeepHealthResponse> {
    this.logger.debug('Legacy health check (/) - redirecting to deep');
    return this.deep();
  }

  @Get('ready')
  @SkipLogging()
  @ApiOperation({ 
    summary: 'Readiness probe — returns 200 when ready to serve traffic (database + cache)',
    description: 'Checks database and cache connectivity. Returns 503 if any critical dependency is down.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is ready to accept traffic',
    type: ReadyHealthResponse,
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is not ready - critical dependencies are down',
    type: ReadyHealthResponse,
  })
  async ready(@Res({ passthrough: true }) res: Response): Promise<ReadyHealthResponse> {
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
  @SkipLogging()
  @ApiOperation({ 
    summary: 'Deep health diagnostics — full system check (database + cache + external)',
    description: 'Performs comprehensive health checks on all critical dependencies including external services. ' +
                 'Returns 503 if any service is down, 200 otherwise.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All systems operational or degraded',
    type: DeepHealthResponse,
  })
  @ApiResponse({ 
    status: 503, 
    description: 'One or more critical services are down',
    type: DeepHealthResponse,
  })
  async deep(@Res({ passthrough: true }) res: Response): Promise<DeepHealthResponse> {
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

    const overallStatus = this.calculateOverallStatus([dbResult, cacheResult, externalResult]);

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

  private mapServiceHealth(result: HealthCheckResult): ServiceHealth {
    return {
      status: result.status,
      latency: result.latency,
      ...(result.error ? { error: result.error } : {}),
    };
  }

  private calculateOverallStatus(results: HealthCheckResult[]): ServiceStatus {
    if (results.some(r => r.status === 'down')) {
      return 'down';
    }
    if (results.some(r => r.status === 'degraded')) {
      return 'degraded';
    }
    return 'ok';
  }
}
