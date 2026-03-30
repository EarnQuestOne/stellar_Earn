import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { AnalyticsReportService, ReportGenerationOptions, ReportQueryOptions } from './services/report.service';
import { AnalyticsAggregationService, BatchAggregationOptions } from './services/aggregation.service';
import { PlatformStatsDto } from './dto/platform-stats.dto';
import { QuestAnalyticsDto } from './dto/quest-analytics.dto';
import { UserAnalyticsDto } from './dto/user-analytics.dto';
import {
  AnalyticsQueryDto,
  QuestAnalyticsQueryDto,
  UserAnalyticsQueryDto,
} from './dto/analytics-query.dto';
import { ReportGenerationDto, ReportQueryDto, AggregationOptionsDto, BatchAggregationDto } from './dto/report.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@RateLimit({ limit: 30, ttlSeconds: 60 })
export class AnalyticsController {
  constructor(
    private readonly platformAnalyticsService: PlatformAnalyticsService,
    private readonly questAnalyticsService: QuestAnalyticsService,
    private readonly userAnalyticsService: UserAnalyticsService,
    private readonly reportService: AnalyticsReportService,
    private readonly aggregationService: AnalyticsAggregationService,
  ) {}

  @Get('platform')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, ttlSeconds: 60 })
  @ApiOperation({
    summary: 'Get platform-wide statistics',
    description:
      'Returns comprehensive platform statistics including total users, quests, submissions, payouts, and time-series data. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform statistics retrieved successfully',
    type: PlatformStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded',
  })
  async getPlatformStats(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PlatformStatsDto> {
    return this.platformAnalyticsService.getPlatformStats(query);
  }

  @Get('quests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get quest performance analytics',
    description:
      'Returns detailed performance metrics for quests including submission rates, approval rates, completion times, and participant counts. Supports filtering by status and quest ID. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quest analytics retrieved successfully',
    type: QuestAnalyticsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded',
  })
  async getQuestAnalytics(
    @Query() query: QuestAnalyticsQueryDto,
  ): Promise<QuestAnalyticsDto> {
    return this.questAnalyticsService.getQuestAnalytics(query);
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user engagement analytics',
    description:
      'Returns user engagement metrics including XP, quests completed, approval rates, rewards earned, and activity history. Includes cohort analysis and user growth trends. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
    type: UserAnalyticsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded',
  })
  async getUserAnalytics(
    @Query() query: UserAnalyticsQueryDto,
  ): Promise<UserAnalyticsDto> {
    return this.userAnalyticsService.getUserAnalytics(query);
  }

  // Report Management Endpoints

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 5, ttlSeconds: 300 }) // 5 reports per 5 minutes
  @ApiOperation({
    summary: 'Generate a new analytics report',
    description: 'Creates and generates an analytics report in the specified format. Report generation happens asynchronously.',
  })
  @ApiBody({
    description: 'Report generation options',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: Object.values(ReportType) },
        format: { type: 'string', enum: Object.values(ReportFormat) },
        parameters: { type: 'object' },
        filters: { type: 'object' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      },
      required: ['type', 'format', 'startDate', 'endDate'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Report generation started successfully',
  })
  async generateReport(
    @Body() options: ReportGenerationDto,
    @GetUser() user: any,
  ): Promise<any> {
    const reportOptions: ReportGenerationOptions = {
      ...options,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
      generatedBy: user,
    };

    const report = await this.reportService.generateReport(reportOptions);
    return {
      id: report.id,
      status: report.status,
      message: 'Report generation started. Check status with GET /analytics/reports/:id',
    };
  }

  @Get('reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query analytics reports',
    description: 'Returns a list of analytics reports with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
  })
  async queryReports(@Query() options: ReportQueryDto): Promise<any> {
    return this.reportService.queryReports(options);
  }

  @Get('reports/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get report details',
    description: 'Returns detailed information about a specific analytics report.',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async getReport(@Param('id') id: string): Promise<any> {
    return this.reportService.getReportById(id);
  }

  @Get('reports/:id/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export report data',
    description: 'Downloads the report data in the original format.',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report exported successfully',
  })
  async exportReport(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const exportResult = await this.reportService.exportReport(id, ReportFormat.JSON);

    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
    res.send(exportResult.data);
  }

  @Delete('reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a report',
    description: 'Deletes an analytics report and its associated data.',
  })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 204,
    description: 'Report deleted successfully',
  })
  async deleteReport(@Param('id') id: string): Promise<void> {
    await this.reportService.deleteReport(id);
  }

  // Aggregation Management Endpoints

  @Post('aggregation/batch')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 2, ttlSeconds: 3600 }) // 2 batch aggregations per hour
  @ApiOperation({
    summary: 'Run batch analytics aggregation',
    description: 'Triggers aggregation of analytics data for the specified types and date range.',
  })
  @ApiBody({
    description: 'Batch aggregation options',
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        granularity: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
        types: { type: 'array', items: { type: 'string', enum: ['platform', 'quest', 'user'] } },
        organizationId: { type: 'string' },
      },
      required: ['startDate', 'endDate'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Batch aggregation completed successfully',
  })
  async runBatchAggregation(@Body() options: BatchAggregationDto): Promise<any> {
    const result = await this.aggregationService.runBatchAggregation(options);
    return {
      ...result,
      message: `Processed ${result.processed} snapshots, skipped ${result.skipped}, ${result.errors} errors`,
    };
  }

  @Post('aggregation/quest/:questId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aggregate data for a specific quest',
    description: 'Runs aggregation specifically for the given quest ID.',
  })
  @ApiParam({ name: 'questId', description: 'Quest ID' })
  @ApiBody({
    description: 'Aggregation options',
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        granularity: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
      },
      required: ['startDate', 'endDate'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Quest aggregation completed successfully',
  })
  async aggregateQuestData(
    @Param('questId') questId: string,
    @Body() options: AggregationOptionsDto,
  ): Promise<any> {
    const processed = await this.aggregationService.aggregateQuestData(questId, {
      ...options,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
    });

    return {
      questId,
      processed,
      message: `Processed ${processed} snapshots for quest ${questId}`,
    };
  }

  @Post('aggregation/user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aggregate data for a specific user',
    description: 'Runs aggregation specifically for the given user ID.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    description: 'Aggregation options',
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        granularity: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
      },
      required: ['startDate', 'endDate'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User aggregation completed successfully',
  })
  async aggregateUserData(
    @Param('userId') userId: string,
    @Body() options: AggregationOptionsDto,
  ): Promise<any> {
    const processed = await this.aggregationService.aggregateUserData(userId, {
      ...options,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
    });

    return {
      userId,
      processed,
      message: `Processed ${processed} snapshots for user ${userId}`,
    };
  }

  @Get('aggregation/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get aggregation statistics',
    description: 'Returns statistics about the analytics snapshots and aggregation status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregation statistics retrieved successfully',
  })
  async getAggregationStats(): Promise<any> {
    return this.aggregationService.getAggregationStats();
  }

  // Real-time Metrics Endpoints

  @Get('realtime/platform')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 20, ttlSeconds: 60 }) // Higher rate limit for real-time data
  @ApiOperation({
    summary: 'Get real-time platform metrics',
    description: 'Returns current platform metrics with minimal caching for real-time dashboards.',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time platform metrics retrieved successfully',
  })
  async getRealtimePlatformMetrics(): Promise<any> {
    // Get data for last 24 hours with hourly granularity
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setHours(startDate.getHours() - 24);

    const query: AnalyticsQueryDto = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      granularity: 'hourly',
    };

    return this.platformAnalyticsService.getPlatformStats(query);
  }

  @Get('trending/:metric')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get trending data for a specific metric',
    description: 'Returns historical trending data for a specific metric across different time periods.',
  })
  @ApiParam({ name: 'metric', description: 'Metric name (e.g., totalUsers, totalQuests)' })
  @ApiResponse({
    status: 200,
    description: 'Trending data retrieved successfully',
  })
  async getTrendingData(
    @Param('metric') metric: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<any> {
    // This would aggregate data from snapshots for trending analysis
    // For now, return platform stats as placeholder
    return this.platformAnalyticsService.getPlatformStats(query);
  }

  @Get('dashboard/summary')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 30, ttlSeconds: 60 })
  @ApiOperation({
    summary: 'Get dashboard summary data',
    description: 'Returns aggregated data optimized for dashboard display including KPIs and recent trends.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboardSummary(): Promise<any> {
    // Get data for last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    const query: AnalyticsQueryDto = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      granularity: 'daily',
    };

    const [platformStats, aggregationStats] = await Promise.all([
      this.platformAnalyticsService.getPlatformStats(query),
      this.aggregationService.getAggregationStats(),
    ]);

    return {
      platformStats,
      aggregationStats,
      lastUpdated: new Date(),
    };
  }
}
