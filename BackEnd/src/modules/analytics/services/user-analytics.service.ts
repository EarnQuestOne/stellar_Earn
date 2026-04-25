import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { User, UserRole } from '../entities/user.entity'; // Updated import
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
import { User as AnalyticsUser } from '../entities/user.entity';

@Injectable()
export class UserAnalyticsService {
  constructor(
    @InjectRepository(AnalyticsUser)
    private userRepository: Repository<AnalyticsUser>,
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

        // Batch-load submissions, payouts and activity history for the entire
        // user batch so we don't issue N+N+N follow-up queries inside the
        // per-user metrics builder below.
        const userIds = users.map((u) => u.id);
        const [submissionsByUser, payoutsByUser, activityByUser] =
          await this.loadUserMetricsRelations(userIds);

        const userMetrics = users.map((user) =>
          this.buildUserMetrics(
            user,
            submissionsByUser.get(user.id) ?? [],
            payoutsByUser.get(user.id) ?? [],
            activityByUser.get(user.id) ?? [],
          ),
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

  private buildUserMetrics(
    user: AnalyticsUser,
    submissions: Submission[],
    payouts: Payout[],
    activityHistory: ActivityDataPoint[],
  ): UserMetrics {
    const approvedSubmissions = submissions.filter(
      (s) =>
        s.status === SubmissionStatus.APPROVED ||
        s.status === SubmissionStatus.PAID,
    );

    const approvalRate = ConversionUtil.calculateApprovalRate(
      approvedSubmissions.length,
      submissions.length,
    );

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
        ? submissions.reduce(
            (latest, s) => (s.submittedAt > latest ? s.submittedAt : latest),
            submissions[0].submittedAt,
          )
        : user.createdAt;

    return {
      stellarAddress: user.stellarAddress || '',
      username: user.username || '',
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
      // Analytics User entity doesn't have these fields, providing defaults
      role: 'USER' as any,
      failedQuests: 0,
      successRate: 0,
      totalEarned: '0',
      bio: undefined,
      avatarUrl: undefined,
      privacyLevel: 'PUBLIC' as any,
      socialLinks: {},
    };
  }

  /**
   * Fetch submissions, payouts, and activity history for a batch of users in
   * three queries total (instead of three queries per user) and group the
   * results by user id for fast in-memory lookups.
   */
  private async loadUserMetricsRelations(
    userIds: string[],
  ): Promise<
    [
      Map<string, Submission[]>,
      Map<string, Payout[]>,
      Map<string, ActivityDataPoint[]>,
    ]
  > {
    const submissionsByUser = new Map<string, Submission[]>();
    const payoutsByUser = new Map<string, Payout[]>();
    const activityByUser = new Map<string, ActivityDataPoint[]>();

    if (userIds.length === 0) {
      return [submissionsByUser, payoutsByUser, activityByUser];
    }

    const [submissions, payouts, activityRows] = await Promise.all([
      this.submissionRepository
        .createQueryBuilder('submission')
        .leftJoinAndSelect('submission.quest', 'quest')
        .leftJoin('submission.user', 'user')
        .addSelect('user.id', 'user_id')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany(),
      this.payoutRepository
        .createQueryBuilder('payout')
        .leftJoin('payout.recipient', 'recipient')
        .addSelect('recipient.id', 'recipient_id')
        .where('recipient.id IN (:...userIds)', { userIds })
        .getMany(),
      this.submissionRepository
        .createQueryBuilder('submission')
        .select('submission.userId', 'userId')
        .addSelect(`DATE_TRUNC('day', submission.submittedAt)`, 'date')
        .addSelect('COUNT(*)', 'submissions')
        .addSelect(
          `COUNT(CASE WHEN submission.status IN ('${SubmissionStatus.APPROVED}', '${SubmissionStatus.PAID}') THEN 1 END)`,
          'questsCompleted',
        )
        .where('submission.userId IN (:...userIds)', { userIds })
        .groupBy('submission.userId')
        .addGroupBy(`DATE_TRUNC('day', submission.submittedAt)`)
        .orderBy('submission.userId')
        .addOrderBy('date', 'ASC')
        .getRawMany(),
    ]);

    for (const submission of submissions) {
      const userId = (submission.user as { id?: string } | undefined)?.id;
      if (!userId) continue;
      const list = submissionsByUser.get(userId) ?? [];
      list.push(submission);
      submissionsByUser.set(userId, list);
    }

    for (const payout of payouts) {
      const userId = (payout.recipient as { id?: string } | undefined)?.id;
      if (!userId) continue;
      const list = payoutsByUser.get(userId) ?? [];
      list.push(payout);
      payoutsByUser.set(userId, list);
    }

    for (const row of activityRows as Array<{
      userId: string;
      date: Date | string;
      submissions: string;
      questsCompleted: string | null;
    }>) {
      const point: ActivityDataPoint = {
        date: DateRangeUtil.formatDate(new Date(row.date)),
        submissions: parseInt(row.submissions),
        questsCompleted: parseInt(row.questsCompleted || '0'),
        xpGained: parseInt(row.questsCompleted || '0') * 100,
      };
      const list = activityByUser.get(row.userId) ?? [];
      list.push(point);
      activityByUser.set(row.userId, list);
    }

    return [submissionsByUser, payoutsByUser, activityByUser];
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
        metrics.sort((a, b) =>
          BigInt(b.totalRewardsEarned) > BigInt(a.totalRewardsEarned) ? 1 : -1,
        );
        break;
      case 'success_rate':
        metrics.sort((a, b) => b.successRate - a.successRate);
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
      .where('submission.submittedAt >= :startDate', { startDate }) // Using submittedAt
      .andWhere('submission.submittedAt <= :endDate', { endDate }) // Using submittedAt
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
      .select('AVG(user.totalXp)', 'avg') // Use totalXp from analytics entity
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

    // Calculate average success rate
    const avgSuccessRateResult = await this.userRepository
      .createQueryBuilder('user')
      .select('AVG(user.successRate)', 'avg')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .getRawOne();

    const avgSuccessRate = ConversionUtil.round(
      parseFloat(avgSuccessRateResult?.avg || '0'),
    );

    return {
      totalUsers,
      activeUsers,
      avgQuestsPerUser,
      avgXpPerUser,
      retentionRate,
      avgSuccessRate,
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
      .where('submission.submittedAt >= :startDate', { startDate }) // Using submittedAt
      .andWhere('submission.submittedAt <= :endDate', { endDate }) // Using submittedAt
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
      .where('submission.submittedAt >= :prevStart', { // Using submittedAt
        prevStart: previousPeriodStart,
      })
      .andWhere('submission.submittedAt < :startDate', { startDate }) // Using submittedAt
      .getRawOne();

    const previouslyActive = parseInt(previouslyActiveResult?.count || '0');

    const currentActiveResult = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(DISTINCT submission.userId)', 'count')
      .where('submission.submittedAt >= :startDate', { startDate }) // Using submittedAt
      .andWhere('submission.submittedAt <= :endDate', { endDate }) // Using submittedAt
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
      xpGained: parseInt(g.count) * 100, // Updated XP calculation
    }));
  }

  /**
   * Get user leaderboard for analytics
   */
  async getLeaderboardAnalytics(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'xp',
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.stellarAddress',
        // 'user.avatarUrl', // Analytics entity doesn't have this
        'user.totalXp', // Use totalXp from analytics entity
        'user.level',
        'user.questsCompleted',
        // 'user.totalEarned', // Analytics entity doesn't have this
        // 'user.successRate', // Analytics entity doesn't have this
      ])
      .where('user.stellarAddress IS NOT NULL')
      .andWhere('user.username IS NOT NULL');

    switch (sortBy) {
      case 'xp':
        queryBuilder.orderBy('user.totalXp', 'DESC'); // Use totalXp
        break;
      case 'quests_completed':
        queryBuilder.orderBy('user.questsCompleted', 'DESC');
        break;
      case 'success_rate':
        // Analytics entity doesn't have successRate, use questsCompleted as fallback
        queryBuilder.orderBy('user.questsCompleted', 'DESC');
        break;
      case 'total_earned':
        // Analytics entity doesn't have totalEarned, use totalXp as fallback
        queryBuilder.orderBy('user.totalXp', 'DESC');
        break;
      default:
        queryBuilder.orderBy('user.totalXp', 'DESC'); // Use totalXp
    }

    queryBuilder.skip(offset).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    const leaderboard = users.map((user, index) => ({
      rank: offset + index + 1,
      user: {
        id: user.id,
        username: user.username,
        // avatarUrl: user.avatarUrl, // Analytics entity doesn't have this
        stellarAddress: user.stellarAddress,
      },
      totalXp: user.totalXp, // Use totalXp
      level: user.level,
      questsCompleted: user.questsCompleted,
      totalEarned: '0', // Default value since analytics entity doesn't have this
      successRate: 0, // Default value since analytics entity doesn't have this
    }));

    return {
      data: leaderboard,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user distribution by role
   */
  async getUserRoleDistribution(): Promise<Record<string, number>> {
    const distribution = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    return distribution.reduce((acc, curr) => {
      acc[curr.role] = parseInt(curr.count);
      return acc;
    }, {});
  }

  /**
   * Get user activity heatmap
   */
  async getUserActivityHeatmap(userId: string): Promise<any> {
    const activity = await this.submissionRepository
      .createQueryBuilder('submission')
      .select(`DATE_TRUNC('day', submission.submittedAt)`, 'date') // Using submittedAt
      .addSelect('COUNT(*)', 'count')
      .where('submission.userId = :userId', { userId })
      .andWhere('submission.submittedAt >= :startDate', { // Using submittedAt
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      })
      .groupBy(`DATE_TRUNC('day', submission.submittedAt)`) // Using submittedAt
      .orderBy('date', 'ASC')
      .getRawMany();

    return activity.map((a) => ({
      date: DateRangeUtil.formatDate(new Date(a.date)),
      activityCount: parseInt(a.count),
    }));
  }
}
