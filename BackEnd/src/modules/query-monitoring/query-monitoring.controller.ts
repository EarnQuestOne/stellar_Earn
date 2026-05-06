import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QueryLoggerService } from '../../common/query-logger/query-logger.service';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Query Monitoring')
@Controller('admin/query-monitoring')
@UseGuards(AdminGuard)
export class QueryMonitoringController {
  constructor(private readonly queryLoggerService: QueryLoggerService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get query performance statistics' })
  @ApiResponse({ status: 200, description: 'Query statistics retrieved successfully' })
  getQueryStatistics() {
    return this.queryLoggerService.getQueryStatistics();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get recent query metrics' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recent metrics to return' })
  @ApiResponse({ status: 200, description: 'Query metrics retrieved successfully' })
  getQueryMetrics(@Query('limit') limit?: number) {
    return this.queryLoggerService.getQueryMetrics(limit);
  }

  @Get('slow-queries')
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, description: 'Custom threshold in milliseconds' })
  @ApiResponse({ status: 200, description: 'Slow queries retrieved successfully' })
  getSlowQueries(@Query('threshold') threshold?: number) {
    return this.queryLoggerService.getSlowQueries(threshold);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for query logging system' })
  @ApiResponse({ status: 200, description: 'Query logging system is healthy' })
  getHealth() {
    const stats = this.queryLoggerService.getQueryStatistics();
    return {
      status: 'healthy',
      queryLoggingEnabled: process.env.DB_QUERY_LOGGING === 'true' || process.env.NODE_ENV === 'development',
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
      criticalQueryThreshold: parseInt(process.env.CRITICAL_QUERY_THRESHOLD || '5000'),
      totalQueriesProcessed: stats.totalQueries,
      slowQueriesCount: stats.slowQueriesCount,
      slowQueriesPercentage: stats.slowQueriesPercentage,
    };
  }

  @Get('clear-metrics')
  @ApiOperation({ summary: 'Clear query metrics history' })
  @ApiResponse({ status: 200, description: 'Query metrics cleared successfully' })
  clearMetrics() {
    this.queryLoggerService.clearMetrics();
    return { message: 'Query metrics cleared successfully' };
  }
}
