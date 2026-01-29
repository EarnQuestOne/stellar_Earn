import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { PlatformStatsDto } from './dto/platform-stats.dto';
import { QuestAnalyticsDto } from './dto/quest-analytics.dto';
import { UserAnalyticsDto } from './dto/user-analytics.dto';
import {
  AnalyticsQueryDto,
  QuestAnalyticsQueryDto,
  UserAnalyticsQueryDto,
} from './dto/analytics-query.dto';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@RateLimit({ limit: 30, ttlSeconds: 60 })
export class AnalyticsController {
  constructor(
    private readonly platformAnalyticsService: PlatformAnalyticsService,
    private readonly questAnalyticsService: QuestAnalyticsService,
    private readonly userAnalyticsService: UserAnalyticsService,
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
}
