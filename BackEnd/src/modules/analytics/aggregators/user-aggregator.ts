import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User as AnalyticsUser } from '../entities/user.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import { BaseAnalyticsAggregator, AggregationOptions, AggregationResult } from './base-aggregator';
import { SnapshotType } from '../entities/analytics-snapshot.entity';

export interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  totalPayouts: number;
  totalEarned: string;
  averageSubmissionsPerUser: number;
  approvalRate: number;
  retentionRate: number;
  averageXpEarned: number;
}

/**
 * User Analytics Aggregator
 * Aggregates user-related metrics including activity, retention, and engagement
 */
@Injectable()
export class UserAnalyticsAggregator extends BaseAnalyticsAggregator {
  constructor(
    @InjectRepository(AnalyticsUser)
    private userRepository: Repository<AnalyticsUser>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
  ) {
    super(
      undefined, // snapshotRepository will be injected via parent
      undefined, // questRepository
      undefined, // submissionRepository
      undefined, // payoutRepository
      undefined, // userRepository
    );
  }

  /**
   * Aggregate user metrics for a specific time period
   */
  async aggregateUserMetrics(options: AggregationOptions): Promise<AggregationResult[]> {
    const dateRanges = this.generateDateRanges(
      options.startDate,
      options.endDate,
      options.granularity,
    );

    const results: AggregationResult[] = [];

    for (const date of dateRanges) {
      const { start, end } = this.getDateRange(date, options.granularity);

      // Skip if snapshot already exists
      if (await this.snapshotExists(date, SnapshotType.USER)) {
        continue;
      }

      const metrics = await this.calculateUserMetrics({
        ...options,
        startDate: start,
        endDate: end,
      });

      const result: AggregationResult = {
        date,
        type: SnapshotType.USER,
        metrics,
      };

      await this.saveSnapshot(result);
      results.push(result);
    }

    return results;
  }

  /**
   * Aggregate metrics for a specific user
   */
  async aggregateUserMetricsById(
    userId: string,
    options: AggregationOptions,
  ): Promise<AggregationResult[]> {
    const dateRanges = this.generateDateRanges(
      options.startDate,
      options.endDate,
      options.granularity,
    );

    const results: AggregationResult[] = [];

    for (const date of dateRanges) {
      const { start, end } = this.getDateRange(date, options.granularity);

      // Skip if snapshot already exists
      if (await this.snapshotExists(date, SnapshotType.USER, userId)) {
        continue;
      }

      const metrics = await this.calculateUserMetricsById(userId, {
        ...options,
        startDate: start,
        endDate: end,
      });

      const result: AggregationResult = {
        date,
        type: SnapshotType.USER,
        referenceId: userId,
        metrics,
      };

      await this.saveSnapshot(result);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate user metrics for a time period
   */
  private async calculateUserMetrics(options: AggregationOptions): Promise<UserMetrics> {
    const conditions = this.getCommonConditions(options);

    // Get user statistics
    const [totalUsers, newUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: conditions }),
    ]);

    // Get active users (users who made submissions in the period)
    const activeUsers = await this.getActiveUsersCount(options);

    // Get submission statistics
    const [totalSubmissions, approvedSubmissions] = await Promise.all([
      this.submissionRepository.count({ where: conditions }),
      this.submissionRepository.count({
        where: { ...conditions, status: SubmissionStatus.APPROVED },
      }),
    ]);

    // Get payout statistics
    const [totalPayouts, totalEarned] = await Promise.all([
      this.payoutRepository.count({ where: conditions }),
      this.getTotalEarned(options),
    ]);

    // Calculate derived metrics
    const averageSubmissionsPerUser = activeUsers > 0 ? totalSubmissions / activeUsers : 0;
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;
    const retentionRate = await this.calculateRetentionRate(options);
    const averageXpEarned = await this.calculateAverageXpEarned(options);

    return {
      totalUsers,
      newUsers,
      activeUsers,
      totalSubmissions,
      approvedSubmissions,
      totalPayouts,
      totalEarned,
      averageSubmissionsPerUser,
      approvalRate,
      retentionRate,
      averageXpEarned,
    };
  }

  /**
   * Calculate metrics for a specific user
   */
  private async calculateUserMetricsById(
    userId: string,
    options: AggregationOptions,
  ): Promise<UserMetrics> {
    const conditions = {
      ...this.getCommonConditions(options),
      userId,
    };

    // Get user details
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Get submission statistics for this user
    const [totalSubmissions, approvedSubmissions] = await Promise.all([
      this.submissionRepository.count({ where: conditions }),
      this.submissionRepository.count({
        where: { ...conditions, status: SubmissionStatus.APPROVED },
      }),
    ]);

    // Get payout statistics for this user
    const [totalPayouts, totalEarned] = await Promise.all([
      this.payoutRepository.count({ where: conditions }),
      this.getTotalEarnedByUser(userId, options),
    ]);

    // Calculate derived metrics
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

    return {
      totalUsers: 1,
      newUsers: 0, // Not applicable for individual user
      activeUsers: totalSubmissions > 0 ? 1 : 0,
      totalSubmissions,
      approvedSubmissions,
      totalPayouts,
      totalEarned,
      averageSubmissionsPerUser: totalSubmissions,
      approvalRate,
      retentionRate: 100, // Individual user retention is always 100% if active
      averageXpEarned: user.xp || 0,
    };
  }

  /**
   * Get count of active users (users who made submissions)
   */
  private async getActiveUsersCount(options: AggregationOptions): Promise<number> {
    const result = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('COUNT(DISTINCT submission.userId)', 'count')
      .where('submission.createdAt BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * Calculate total earned amount
   */
  private async getTotalEarned(options: AggregationOptions): Promise<string> {
    const result = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(CAST(payout.amount AS DECIMAL))', 'total')
      .where('payout.createdAt BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .andWhere('payout.status = :status', { status: 'completed' })
      .getRawOne();

    return result.total || '0';
  }

  /**
   * Calculate total earned by a specific user
   */
  private async getTotalEarnedByUser(userId: string, options: AggregationOptions): Promise<string> {
    const result = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(CAST(payout.amount AS DECIMAL))', 'total')
      .where('payout.userId = :userId', { userId })
      .andWhere('payout.createdAt BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .andWhere('payout.status = :status', { status: 'completed' })
      .getRawOne();

    return result.total || '0';
  }

  /**
   * Calculate user retention rate
   * This is a simplified calculation - in a real system, you'd track user activity over multiple periods
   */
  private async calculateRetentionRate(options: AggregationOptions): Promise<number> {
    // For simplicity, calculate retention as the ratio of users who were active
    // in the previous period and are still active in the current period
    const previousPeriodEnd = new Date(options.startDate);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24));

    const [previousActiveUsers, currentActiveUsers] = await Promise.all([
      this.getActiveUsersCount({ ...options, startDate: previousPeriodStart, endDate: previousPeriodEnd }),
      this.getActiveUsersCount(options),
    ]);

    if (previousActiveUsers === 0) return 100;

    return (currentActiveUsers / previousActiveUsers) * 100;
  }

  /**
   * Calculate average XP earned by users
   */
  private async calculateAverageXpEarned(options: AggregationOptions): Promise<number> {
    const users = await this.userRepository.find({
      where: this.getCommonConditions(options),
      select: ['xp'],
    });

    if (users.length === 0) return 0;

    const totalXp = users.reduce((sum, user) => sum + (user.xp || 0), 0);
    return totalXp / users.length;
  }
}