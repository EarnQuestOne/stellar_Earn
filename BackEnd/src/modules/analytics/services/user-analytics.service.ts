import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import {
  UserAnalyticsDto,
  UserMetrics,
  UserSummary,
  CohortAnalysis,
  ActivityDataPoint,
} from '../dto/user-analytics.dto';
import { UserAnalyticsQueryDto } from '../dto/analytics-query.dto';
import { DateRangeUtil } from '../utils/date-range.util';
import { ConversionUtil } from '../utils/conversion.util';
import { CacheService } from './cache.service';

@Injectable()
export class UserAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    private cacheService: CacheService,
  ) {}

  /**
   * Get user engagement analytics
   */
  async getUserAnalytics(
    query: UserAnalyticsQueryDto,
  ): Promise<UserAnalyticsDto> {
    const { startDate, endDate } = DateRangeUtil.parseDateRange(
      query.startDate,
      query.endDate,
    );
    DateRangeUtil.validateMaxRange(startDate, endDate);

    const cacheKey = this.cacheService.generateKey('users', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      stellarAddress: query.stellarAddress || 'all',
      limit: query.limit,
      sortBy: query.sortBy,
    });

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const queryBuilder = this.userRepository
          .createQueryBuilder('user')
          .where('user.createdAt >= :startDate', { startDate })
          .andWhere('user.createdAt <= :endDate', { endDate });

        if (query.stellarAddress) {
          queryBuilder.andWhere('user.stellarAddress = :stellarAddress', {
            stellarAddress: query.stellarAddress,
          });
        }

        const users = await queryBuilder.take(query.limit || 20).getMany();

        const userMetrics = await Promise.all(
          users.map((user) => this.getUserMetrics(user)),
        );

        this.sortUserMetrics(userMetrics, query.sortBy || 'xp');

        const [summary, cohortAnalysis, userGrowth] = await Promise.all([
          this.calculateSummary(startDate, endDate),
          this.calculateCohortAnalysis(startDate, endDate),
          this.getUserGrowth(startDate, endDate),
        ]);

        return {
          users: userMetrics,
          summary,
          cohortAnalysis,
          userGrowth,
        };
      },
      600, // 10 minutes TTL
    );
  }

  private async getUserMetrics(user: User): Promise<UserMetrics> {
    const submissions = await this.submissionRepository.find({
      where: { user: { id: user.id } } as any,
    });

    const approvedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.APPROVED || s.status === SubmissionStatus.PAID,
    );

    const approvalRate = ConversionUtil.calculateApprovalRate(
      approvedSubmissions.length,
      submissions.length,
    );

    const payouts = await this.payoutRepository.find({
      where: {
        recipient: { id: user.id },
      } as any,
    });

    const totalRewardsEarned = ConversionUtil.sumBigIntStrings(
      payouts.map((p) => p.amount),
    );

    const avgCompletionTime = ConversionUtil.calculateAverageTime(
      approvedSubmissions,
      'submittedAt',
      'reviewedAt',
    );

    const lastActiveAt =
      submissions.length > 0
        ? submissions.reduce((latest, s) =>
            s.submittedAt > latest ? s.submittedAt : latest,
          submissions[0].submittedAt)
        : user.createdAt;

    const activityHistory = await this.getUserActivityHistory(user.id);

    return {
      stellarAddress: user.stellarAddress,
      username: user.username,
      totalXp: user.totalXp,
      level: user.level,
      questsCompleted: user.questsCompleted,
      totalSubmissions: submissions.length,
      approvedSubmissions: approvedSubmissions.length,
      approvalRate,
      totalRewardsEarned,
      avgCompletionTime,
      lastActiveAt,
      createdAt: user.createdAt,
      badges: user.badges || [],
      activityHistory,
    };
  }

  private async getUserActivityHistory(
    userId: string,
  ): Promise<ActivityDataPoint[]> {
    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select(`DATE_TRUNC('day', submission.submittedAt)`, 'date')
      .addSelect('COUNT(*)', 'submissions')
      .addSelect(
        `COUNT(CASE WHEN submission.status IN ('${SubmissionStatus.APPROVED}', '${SubmissionStatus.PAID}') THEN 1 END)`,
        'questsCompleted',
      )
      .where('submission.userId = :userId', { userId })
      .groupBy(`DATE_TRUNC('day', submission.submittedAt)`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return submissions.map((s) => ({
      date: DateRangeUtil.formatDate(new Date(s.date)),
      submissions: parseInt(s.submissions),
      questsCompleted: parseInt(s.questsCompleted || '0'),
      xpGained: parseInt(s.questsCompleted || '0') * 10, // Assuming 10 XP per quest
    }));
  }

  private sortUserMetrics(metrics: UserMetrics[], sortBy: string): void {
    switch (sortBy) {
      case 'xp':
        metrics.sort((a, b) => b.totalXp - a.totalXp);
        break;
      case 'quests_completed':
        metrics.sort((a, b) => b.questsCompleted - a.questsCompleted);
        break;
      case 'total_rewards':
        metrics.sort(
          (a, b) =>
            BigInt(b.totalRewardsEarned) > BigInt(a.totalRewardsEarned)
              ? 1
              : -1,
        );
        break;
      case 'created_at':
      default:
        metrics.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
    }
  }

  private async calculateSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<UserSummary> {
    const totalUsers = await this.userRepository.count({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });

    const activeUsersResult = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(DISTINCT submission.userId)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate })
      .andWhere('submission.submittedAt <= :endDate', { endDate })
      .getRawOne();

    const activeUsers = parseInt(activeUsersResult?.count || '0');

    const avgQuestsResult = await this.userRepository
      .createQueryBuilder('user')
      .select('AVG(user.questsCompleted)', 'avg')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .getRawOne();

    const avgQuestsPerUser = ConversionUtil.round(
      parseFloat(avgQuestsResult?.avg || '0'),
    );

    const avgXpResult = await this.userRepository
      .createQueryBuilder('user')
      .select('AVG(user.totalXp)', 'avg')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .getRawOne();

    const avgXpPerUser = ConversionUtil.round(
      parseFloat(avgXpResult?.avg || '0'),
    );

    const retentionRate = ConversionUtil.calculateRetentionRate(
      totalUsers,
      activeUsers,
    );

    return {
      totalUsers,
      activeUsers,
      avgQuestsPerUser,
      avgXpPerUser,
      retentionRate,
    };
  }

  private async calculateCohortAnalysis(
    startDate: Date,
    endDate: Date,
  ): Promise<CohortAnalysis> {
    const newUsersThisPeriod = await this.userRepository.count({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });

    // Users who were created before the period but were active during it
    const returningUsersResult = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoin('submission.user', 'user')
      .select('COUNT(DISTINCT user.id)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate })
      .andWhere('submission.submittedAt <= :endDate', { endDate })
      .andWhere('user.createdAt < :startDate', { startDate })
      .getRawOne();

    const returningUsers = parseInt(returningUsersResult?.count || '0');

    // Users who were active before but not during this period
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(
      previousPeriodStart.getDate() -
        DateRangeUtil.getDaysDifference(startDate, endDate),
    );

    const previouslyActiveResult = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(DISTINCT submission.userId)', 'count')
      .where('submission.submittedAt >= :prevStart', {
        prevStart: previousPeriodStart,
      })
      .andWhere('submission.submittedAt < :startDate', { startDate })
      .getRawOne();

    const previouslyActive = parseInt(previouslyActiveResult?.count || '0');

    const currentActiveResult = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(DISTINCT submission.userId)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate })
      .andWhere('submission.submittedAt <= :endDate', { endDate })
      .getRawOne();

    const currentActive = parseInt(currentActiveResult?.count || '0');

    const churnedUsers = Math.max(0, previouslyActive - currentActive);

    return {
      newUsersThisPeriod,
      returningUsers,
      churnedUsers,
    };
  }

  private async getUserGrowth(
    startDate: Date,
    endDate: Date,
  ): Promise<ActivityDataPoint[]> {
    const growth = await this.userRepository
      .createQueryBuilder('user')
      .select(`DATE_TRUNC('day', user.createdAt)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .groupBy(`DATE_TRUNC('day', user.createdAt)`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return growth.map((g) => ({
      date: DateRangeUtil.formatDate(new Date(g.date)),
      submissions: 0,
      questsCompleted: parseInt(g.count),
      xpGained: 0,
    }));
  }
}
