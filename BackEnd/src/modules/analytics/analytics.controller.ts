import {
  Controller,
  Get,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { StreamExportService } from './services/stream-export.service';
import { PlatformStatsDto } from './dto/platform-stats.dto';
import { QuestAnalyticsDto } from './dto/quest-analytics.dto';
import { UserAnalyticsDto } from './dto/user-analytics.dto';
import {
  AnalyticsQueryDto,
  QuestAnalyticsQueryDto,
  UserAnalyticsQueryDto,
} from './dto/analytics-query.dto';
import { ExportQueryDto, ExportFormat } from './dto/export-query.dto';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { Quest } from './entities/quest.entity';
import { Submission } from './entities/submission.entity';

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
    private readonly moduleRef: ModuleRef,
    private readonly streamExportService: StreamExportService,
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
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

  @Get('export/quests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export quest performance metrics',
    description:
      'Streams quest metrics as CSV, JSON, or JSONL file. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quest metrics exported successfully',
  })
  async exportQuests(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const queryBuilder = this.questRepository.createQueryBuilder('quest');

    if (query.startDate) {
      queryBuilder.andWhere('quest.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere('quest.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    queryBuilder.orderBy('quest.createdAt', 'DESC');

    const iterator = this.streamExportService.getQueryIterator(queryBuilder);

    const questColumns = [
      { key: 'id', header: 'ID' },
      { key: 'contractQuestId', header: 'Contract Quest ID' },
      { key: 'title', header: 'Title' },
      { key: 'rewardAsset', header: 'Reward Asset' },
      { key: 'rewardAmount', header: 'Reward Amount' },
      { key: 'verifierAddress', header: 'Verifier Address' },
      { key: 'deadline', header: 'Deadline' },
      { key: 'status', header: 'Status' },
      { key: 'totalClaims', header: 'Total Claims' },
      { key: 'totalSubmissions', header: 'Total Submissions' },
      { key: 'approvedSubmissions', header: 'Approved Submissions' },
      { key: 'rejectedSubmissions', header: 'Rejected Submissions' },
      { key: 'createdAt', header: 'Created At' },
    ];

    async function* mappedQuestIterator() {
      for await (const q of iterator) {
        yield {
          id: q.id,
          contractQuestId: q.contractQuestId || '',
          title: q.title || '',
          rewardAsset: q.rewardAsset || '',
          rewardAmount: q.rewardAmount || '0',
          verifierAddress: q.verifierAddress || '',
          deadline: q.deadline ? q.deadline.toISOString() : '',
          status: q.status || '',
          totalClaims: q.totalClaims || 0,
          totalSubmissions: q.totalSubmissions || 0,
          approvedSubmissions: q.approvedSubmissions || 0,
          rejectedSubmissions: q.rejectedSubmissions || 0,
          createdAt: q.createdAt ? q.createdAt.toISOString() : '',
        };
      }
    }

    const filename = `quests-export-${Date.now()}`;
    if (query.format === ExportFormat.CSV) {
      await this.streamExportService.streamAsCSV(
        res,
        mappedQuestIterator(),
        filename,
        questColumns,
      );
    } else if (query.format === ExportFormat.JSONL) {
      await this.streamExportService.streamAsJSONLines(
        res,
        mappedQuestIterator(),
        filename,
      );
    } else {
      await this.streamExportService.streamAsJSON(
        res,
        mappedQuestIterator(),
        filename,
      );
    }
  }

  @Get('export/users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export user engagement metrics',
    description:
      'Streams user metrics as CSV, JSON, or JSONL file. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'User metrics exported successfully',
  })
  async exportUsers(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (query.startDate) {
      queryBuilder.andWhere('user.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere('user.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const iterator = this.streamExportService.getQueryIterator(queryBuilder);

    const userColumns = [
      { key: 'id', header: 'ID' },
      { key: 'stellarAddress', header: 'Stellar Address' },
      { key: 'username', header: 'Username' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role' },
      { key: 'xp', header: 'XP' },
      { key: 'level', header: 'Level' },
      { key: 'questsCompleted', header: 'Quests Completed' },
      { key: 'failedQuests', header: 'Failed Quests' },
      { key: 'successRate', header: 'Success Rate' },
      { key: 'totalEarned', header: 'Total Earned' },
      { key: 'lastActiveAt', header: 'Last Active At' },
      { key: 'createdAt', header: 'Created At' },
    ];

    async function* mappedUserIterator() {
      for await (const u of iterator as AsyncIterable<any>) {
        yield {
          id: u.id,
          stellarAddress: u.stellarAddress || '',
          username: u.username || '',
          email: u.email || '',
          role: u.role || '',
          xp: u.xp || 0,
          level: u.level || 0,
          questsCompleted: u.questsCompleted || 0,
          failedQuests: u.failedQuests || 0,
          successRate: u.successRate || 0,
          totalEarned: u.totalEarned || '0',
          lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : '',
          createdAt: u.createdAt ? u.createdAt.toISOString() : '',
        };
      }
    }

    const filename = `users-export-${Date.now()}`;
    if (query.format === ExportFormat.CSV) {
      await this.streamExportService.streamAsCSV(
        res,
        mappedUserIterator(),
        filename,
        userColumns,
      );
    } else if (query.format === ExportFormat.JSONL) {
      await this.streamExportService.streamAsJSONLines(
        res,
        mappedUserIterator(),
        filename,
      );
    } else {
      await this.streamExportService.streamAsJSON(
        res,
        mappedUserIterator(),
        filename,
      );
    }
  }

  @Get('export/submissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export quest submissions data',
    description:
      'Streams quest submissions data as CSV, JSON, or JSONL file. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quest submissions exported successfully',
  })
  async exportSubmissions(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.quest', 'quest')
      .leftJoinAndSelect('submission.user', 'user');

    if (query.startDate) {
      queryBuilder.andWhere('submission.submittedAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere('submission.submittedAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    queryBuilder.orderBy('submission.submittedAt', 'DESC');

    const iterator = this.streamExportService.getQueryIterator(queryBuilder);

    const submissionColumns = [
      { key: 'id', header: 'ID' },
      { key: 'contractSubmissionId', header: 'Contract Submission ID' },
      { key: 'questId', header: 'Quest ID' },
      { key: 'userId', header: 'User ID' },
      { key: 'proofHash', header: 'Proof Hash' },
      { key: 'status', header: 'Status' },
      { key: 'submittedAt', header: 'Submitted At' },
      { key: 'reviewedAt', header: 'Reviewed At' },
      { key: 'paidAt', header: 'Paid At' },
      { key: 'createdAt', header: 'Created At' },
    ];

    async function* mappedSubmissionIterator() {
      for await (const sub of iterator) {
        yield {
          id: sub.id,
          contractSubmissionId: sub.contractSubmissionId || '',
          questId: sub.quest?.id || '',
          userId: sub.user?.id || '',
          proofHash: sub.proofHash || '',
          status: sub.status || '',
          submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : '',
          reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : '',
          paidAt: sub.paidAt ? sub.paidAt.toISOString() : '',
          createdAt: sub.createdAt ? sub.createdAt.toISOString() : '',
        };
      }
    }

    const filename = `submissions-export-${Date.now()}`;
    if (query.format === ExportFormat.CSV) {
      await this.streamExportService.streamAsCSV(
        res,
        mappedSubmissionIterator(),
        filename,
        submissionColumns,
      );
    } else if (query.format === ExportFormat.JSONL) {
      await this.streamExportService.streamAsJSONLines(
        res,
        mappedSubmissionIterator(),
        filename,
      );
    } else {
      await this.streamExportService.streamAsJSON(
        res,
        mappedSubmissionIterator(),
        filename,
      );
    }
  }
}
