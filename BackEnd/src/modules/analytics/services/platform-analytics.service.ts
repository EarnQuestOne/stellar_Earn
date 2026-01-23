import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Quest, QuestStatus } from '../entities/quest.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import { PlatformStatsDto, TimeSeriesDataPoint } from '../dto/platform-stats.dto';
import { AnalyticsQueryDto, Granularity } from '../dto/analytics-query.dto';
import { DateRangeUtil } from '../utils/date-range.util';
import { ConversionUtil } from '../utils/conversion.util';
import { CacheService } from './cache.service';

@Injectable()
export class PlatformAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    private cacheService: CacheService,
  ) {}

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(query: AnalyticsQueryDto): Promise<PlatformStatsDto> {
    const { startDate, endDate } = DateRangeUtil.parseDateRange(
      query.startDate,
      query.endDate,
    );
    DateRangeUtil.validateMaxRange(startDate, endDate);

    const cacheKey = this.cacheService.generateKey('platform', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      granularity: query.granularity,
    });

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const [
          totalUsers,
          totalQuests,
          totalSubmissions,
          approvedSubmissions,
          totalPayouts,
          totalRewardsDistributed,
          activeUsers,
          questsByStatus,
          submissionsByStatus,
          allSubmissions,
          timeSeries,
        ] = await Promise.all([
          this.getTotalUsers(startDate, endDate),
          this.getTotalQuests(startDate, endDate),
          this.getTotalSubmissions(startDate, endDate),
          this.getApprovedSubmissions(startDate, endDate),
          this.getTotalPayouts(startDate, endDate),
          this.getTotalRewardsDistributed(startDate, endDate),
          this.getActiveUsers(startDate, endDate),
          this.getQuestsByStatus(startDate, endDate),
          this.getSubmissionsByStatus(startDate, endDate),
          this.getAllSubmissions(startDate, endDate),
          this.getTimeSeries(startDate, endDate, query.granularity || Granularity.DAY),
        ]);

        const approvalRate = ConversionUtil.calculateApprovalRate(
          approvedSubmissions,
          totalSubmissions,
        );

        const avgApprovalTime = ConversionUtil.calculateAverageTime(
          allSubmissions.filter((s) => s.status === SubmissionStatus.APPROVED),
          'submittedAt',
          'reviewedAt',
        );

        return {
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
      },
      300, // 5 minutes TTL
    );
  }

  private async getTotalUsers(startDate: Date, endDate: Date): Promise<number> {
    return this.userRepository.count({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  private async getTotalQuests(startDate: Date, endDate: Date): Promise<number> {
    return this.questRepository.count({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  private async getTotalSubmissions(startDate: Date, endDate: Date): Promise<number> {
    return this.submissionRepository.count({
      where: {
        submittedAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  private async getApprovedSubmissions(startDate: Date, endDate: Date): Promise<number> {
    return this.submissionRepository.count({
      where: {
        submittedAt: { $gte: startDate, $lte: endDate } as any,
        status: SubmissionStatus.APPROVED,
      },
    });
  }

  private async getTotalPayouts(startDate: Date, endDate: Date): Promise<number> {
    return this.payoutRepository.count({
      where: {
        paidAt: { $gte: startDate, $lte: endDate } as any,
      },
    });
  }

  private async getTotalRewardsDistributed(startDate: Date, endDate: Date): Promise<string> {
    const result = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(CAST(payout.amount AS BIGINT))', 'total')
      .where('payout.paidAt >= :startDate', { startDate })
      .andWhere('payout.paidAt <= :endDate', { endDate })
      .getRawOne();

    return result?.total?.toString() || '0';
  }

  private async getActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(DISTINCT submission.userId)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate })
      .andWhere('submission.submittedAt <= :endDate', { endDate })
      .getRawOne();

    return parseInt(result?.count || '0');
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

    quests.forEach((q) => {
      result[q.status] = parseInt(q.count);
    });

    return result;
  }

  private async getSubmissionsByStatus(startDate: Date, endDate: Date) {
    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('submission.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate })
      .andWhere('submission.submittedAt <= :endDate', { endDate })
      .groupBy('submission.status')
      .getRawMany();

    const result = {
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Paid: 0,
    };

    submissions.forEach((s) => {
      result[s.status] = parseInt(s.count);
    });

    return result;
  }

  private async getAllSubmissions(startDate: Date, endDate: Date): Promise<Submission[]> {
    return this.submissionRepository.find({
      where: {
        submittedAt: { $gte: startDate, $lte: endDate } as any,
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
      .select(`DATE_TRUNC('${dateTrunc}', submission.submittedAt)`, 'date')
      .addSelect('COUNT(*)', 'totalSubmissions')
      .addSelect(
        `COUNT(CASE WHEN submission.status = '${SubmissionStatus.APPROVED}' THEN 1 END)`,
        'approvedSubmissions',
      )
      .where('submission.submittedAt >= :startDate', { startDate })
      .andWhere('submission.submittedAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('${dateTrunc}', submission.submittedAt)`)
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
