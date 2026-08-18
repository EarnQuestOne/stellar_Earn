import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Quest } from '../entities/quest.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import {
  PlatformStatsDto,
  TimeSeriesDataPoint,
} from '../dto/platform-stats.dto';
import { AnalyticsQueryDto, Granularity } from '../dto/analytics-query.dto';
import { DateRangeUtil } from '../utils/date-range.util';
import { ConversionUtil } from '../utils/conversion.util';
import { CacheService as UnifiedCacheService } from '../../cache/cache.service';
import { CacheKeys, CacheTags, CacheTtl } from '../../cache/cache-tags';
import { User as AnalyticsUser } from '../entities/user.entity';
import {
  AnalyticsSnapshot,
  SnapshotType,
} from '../entities/analytics-snapshot.entity';
import { MetricsService } from '../../../common/services/metrics.service';

@Injectable()
export class PlatformAnalyticsService {
  private readonly logger = new Logger(PlatformAnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsUser)
    private userRepository: Repository<AnalyticsUser>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    @InjectRepository(AnalyticsSnapshot)
    private snapshotRepository: Repository<AnalyticsSnapshot>,
    private readonly unifiedCache: UnifiedCacheService,
    private metricsService: MetricsService,
  ) {}

  async getPlatformStats(query: AnalyticsQueryDto): Promise<PlatformStatsDto> {
    const { startDate, endDate } = DateRangeUtil.parseDateRange(
      query.startDate,
      query.endDate,
    );
    DateRangeUtil.validateMaxRange(startDate, endDate);

    const granularity = query.granularity || Granularity.DAY;

    // Unified cache-aside read tagged for platform analytics, so a relevant
    // write can drop it via `invalidateTag(CacheTags.analyticsPlatform())`
    // (#2159). This supersedes the earlier `CacheService.wrap` short-TTL cache
    // from #2146 while keeping the consolidated submission aggregation below.
    return this.unifiedCache.getOrSet(
      CacheKeys.platformStats({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        granularity,
      }),
      CacheTtl.platformStats,
      [CacheTags.analyticsPlatform()],
      () => this.resolvePlatformStats(startDate, endDate, granularity),
    );
  }

  private async resolvePlatformStats(
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): Promise<PlatformStatsDto> {
    const snapshot = await this.snapshotRepository.findOne({
      where: {
        type: SnapshotType.PLATFORM,
        date: MoreThanOrEqual(new Date(Date.now() - 5 * 60 * 1000)),
      },
      order: { date: 'DESC' },
    });

    if (snapshot) {
      this.metricsService.incrementCounter('analytics_computation_total', {
        source: 'snapshot',
      });
      return snapshot.metrics as unknown as PlatformStatsDto;
    }

    this.metricsService.incrementCounter('analytics_computation_total', {
      source: 'live',
    });
    return this.computeAndStorePlatformStats(startDate, endDate, granularity);
  }

  async computeAndStorePlatformStats(
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): Promise<PlatformStatsDto> {
    const startTime = Date.now();

    const [
      totalUsers,
      totalQuests,
      submissionAggregates,
      totalPayouts,
      totalRewardsDistributed,
      questsByStatus,
      submissionsByStatus,
      allSubmissions,
      timeSeries,
    ] = await Promise.all([
      this.getTotalUsers(startDate, endDate),
      this.getTotalQuests(startDate, endDate),
      // Single grouped query replaces the previous three submission COUNT
      // scans (total, approved, active users) over the same window (#2146).
      this.getSubmissionAggregates(startDate, endDate),
      this.getTotalPayouts(startDate, endDate),
      this.getTotalRewardsDistributed(startDate, endDate),
      this.getQuestsByStatus(startDate, endDate),
      this.getSubmissionsByStatus(startDate, endDate),
      this.getAllSubmissions(startDate, endDate),
      this.getTimeSeries(startDate, endDate, granularity),
    ]);

    const {
      total: totalSubmissions,
      approved: approvedSubmissions,
      activeUsers,
    } = submissionAggregates;

    const approvalRate = ConversionUtil.calculateApprovalRate(
      approvedSubmissions,
      totalSubmissions,
    );

    const avgApprovalTime = ConversionUtil.calculateAverageTime(
      allSubmissions.filter((s) => s.status === SubmissionStatus.APPROVED),
      'submittedAt',
      'reviewedAt',
    );

    const stats: PlatformStatsDto = {
      totalUsers,
      totalQuests,
      totalSubmissions,
      approvedSubmissions,
      totalPayouts,
      totalRewardsDistributed,
      approvalRate,
      avgApprovalTime,
      activeUsers,
      timeSeries,
      questsByStatus,
      submissionsByStatus,
    };

    await this.snapshotRepository.upsert(
      {
        type: SnapshotType.PLATFORM,
        date: new Date(),
        metrics: stats as unknown as Record<string, any>,
      },
      ['type', 'date'],
    );

    this.metricsService.observeHistogram(
      'analytics_computation_duration_seconds',
      (Date.now() - startTime) / 1000,
    );

    return stats;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async computePlatformAnalytics(): Promise<void> {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 30,
    );
    const endDate = now;
    try {
      await this.computeAndStorePlatformStats(
        startDate,
        endDate,
        Granularity.DAY,
      );
      this.logger.log('Background platform analytics computation completed');
    } catch (error) {
      this.logger.error(
        'Background platform analytics computation failed',
        error,
      );
    }
  }

  private async getTotalUsers(startDate: Date, endDate: Date): Promise<number> {
    return this.userRepository.count({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  private async getTotalQuests(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.questRepository.count({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  /**
   * Aggregate submission metrics for a window in a single query instead of the
   * three separate COUNT scans this previously required (total, approved, and
   * distinct active users), cutting database round-trips on every dashboard
   * load (#2146).
   */
  private async getSubmissionAggregates(
    startDate: Date,
    endDate: Date,
  ): Promise<{ total: number; approved: number; activeUsers: number }> {
    const raw = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(CASE WHEN submission.status = '${SubmissionStatus.APPROVED}' THEN 1 END)`,
        'approved',
      )
      .addSelect('COUNT(DISTINCT submission.userId)', 'activeUsers')
      .where('submission.submittedAt >= :startDate', { startDate }) // Using submittedAt
      .andWhere('submission.submittedAt <= :endDate', { endDate }) // Using submittedAt
      .getRawOne();

    return {
      total: parseInt(raw?.total || '0'),
      approved: parseInt(raw?.approved || '0'),
      activeUsers: parseInt(raw?.activeUsers || '0'),
    };
  }

  private async getTotalPayouts(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.payoutRepository.count({
      where: {
        paidAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  private async getTotalRewardsDistributed(
    startDate: Date,
    endDate: Date,
  ): Promise<string> {
    const result = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(CAST(payout.amount AS BIGINT))', 'total')
      .where('payout.paidAt >= :startDate', { startDate })
      .andWhere('payout.paidAt <= :endDate', { endDate })
      .getRawOne();

    return result?.total?.toString() || '0';
  }

  private async getQuestsByStatus(startDate: Date, endDate: Date) {
    const quests = await this.questRepository
      .createQueryBuilder('quest')
      .select('quest.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('quest.createdAt >= :startDate', { startDate })
      .andWhere('quest.createdAt <= :endDate', { endDate })
      .groupBy('quest.status')
      .getRawMany();

    const result = {
      Active: 0,
      Paused: 0,
      Completed: 0,
      Expired: 0,
    };

    quests.forEach((q: any) => {
      result[q.status as keyof typeof result] = parseInt(q.count);
    });

    return result;
  }

  private async getSubmissionsByStatus(startDate: Date, endDate: Date) {
    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('submission.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate }) // Using submittedAt
      .andWhere('submission.submittedAt <= :endDate', { endDate }) // Using submittedAt
      .groupBy('submission.status')
      .getRawMany();

    const result = {
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Paid: 0,
    };

    submissions.forEach((s: any) => {
      result[s.status as keyof typeof result] = parseInt(s.count);
    });

    return result;
  }

  private async getAllSubmissions(
    startDate: Date,
    endDate: Date,
  ): Promise<Submission[]> {
    return this.submissionRepository.find({
      where: {
        submittedAt: { $gte: startDate, $lte: endDate } as any, // Using submittedAt
      },
    });
  }

  private async getTimeSeries(
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): Promise<TimeSeriesDataPoint[]> {
    const dateTrunc = granularity;

    // Get user signups by date
    const userSeries = await this.userRepository
      .createQueryBuilder('user')
      .select(`DATE_TRUNC('${dateTrunc}', user.createdAt)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateTrunc}', user.createdAt)`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // Get quests created by date
    const questSeries = await this.questRepository
      .createQueryBuilder('quest')
      .select(`DATE_TRUNC('${dateTrunc}', quest.createdAt)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('quest.createdAt >= :startDate', { startDate })
      .andWhere('quest.createdAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateTrunc}', quest.createdAt)`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // Get submissions by date
    const submissionSeries = await this.submissionRepository
      .createQueryBuilder('submission')
      .select(`DATE_TRUNC('${dateTrunc}', submission.submittedAt)`, 'date') // Using submittedAt
      .addSelect('COUNT(*)', 'totalSubmissions')
      .addSelect(
        `COUNT(CASE WHEN submission.status = '${SubmissionStatus.APPROVED}' THEN 1 END)`,
        'approvedSubmissions',
      )
      .where('submission.submittedAt >= :startDate', { startDate }) // Using submittedAt
      .andWhere('submission.submittedAt <= :endDate', { endDate }) // Using submittedAt
      .groupBy(`DATE_TRUNC('${dateTrunc}', submission.submittedAt)`) // Using submittedAt
      .orderBy('date', 'ASC')
      .getRawMany();

    // Get payouts by date
    const payoutSeries = await this.payoutRepository
      .createQueryBuilder('payout')
      .select(`DATE_TRUNC('${dateTrunc}', payout.paidAt)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CAST(payout.amount AS BIGINT))', 'total')
      .where('payout.paidAt >= :startDate', { startDate })
      .andWhere('payout.paidAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateTrunc}', payout.paidAt)`)
      .orderBy('date', 'ASC')
      .getRawMany();

    // Combine all series into single time series
    const dateMap = new Map<string, TimeSeriesDataPoint>();

    userSeries.forEach((item) => {
      const dateStr = DateRangeUtil.formatDate(new Date(item.date));
      dateMap.set(dateStr, {
        date: dateStr,
        newUsers: parseInt(item.count),
        newQuests: 0,
        newSubmissions: 0,
        approvedSubmissions: 0,
        totalPayouts: 0,
        rewardAmount: '0',
      });
    });

    questSeries.forEach((item) => {
      const dateStr = DateRangeUtil.formatDate(new Date(item.date));
      const existing = dateMap.get(dateStr) || {
        date: dateStr,
        newUsers: 0,
        newQuests: 0,
        newSubmissions: 0,
        approvedSubmissions: 0,
        totalPayouts: 0,
        rewardAmount: '0',
      };
      existing.newQuests = parseInt(item.count);
      dateMap.set(dateStr, existing);
    });

    submissionSeries.forEach((item) => {
      const dateStr = DateRangeUtil.formatDate(new Date(item.date));
      const existing = dateMap.get(dateStr) || {
        date: dateStr,
        newUsers: 0,
        newQuests: 0,
        newSubmissions: 0,
        approvedSubmissions: 0,
        totalPayouts: 0,
        rewardAmount: '0',
      };
      existing.newSubmissions = parseInt(item.totalSubmissions);
      existing.approvedSubmissions = parseInt(item.approvedSubmissions || '0');
      dateMap.set(dateStr, existing);
    });

    payoutSeries.forEach((item) => {
      const dateStr = DateRangeUtil.formatDate(new Date(item.date));
      const existing = dateMap.get(dateStr) || {
        date: dateStr,
        newUsers: 0,
        newQuests: 0,
        newSubmissions: 0,
        approvedSubmissions: 0,
        totalPayouts: 0,
        rewardAmount: '0',
      };
      existing.totalPayouts = parseInt(item.count);
      existing.rewardAmount = item.total?.toString() || '0';
      dateMap.set(dateStr, existing);
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
