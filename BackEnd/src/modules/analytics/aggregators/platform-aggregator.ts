import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest, QuestStatus } from '../entities/quest.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import { User as AnalyticsUser } from '../entities/user.entity';
import { BaseAnalyticsAggregator, AggregationOptions, AggregationResult } from './base-aggregator';
import { SnapshotType } from '../entities/analytics-snapshot.entity';

export interface PlatformMetrics {
  totalUsers: number;
  newUsers: number;
  totalQuests: number;
  newQuests: number;
  totalSubmissions: number;
  newSubmissions: number;
  approvedSubmissions: number;
  totalPayouts: number;
  newPayouts: number;
  totalRevenue: string;
  totalFees: string;
  activeUsers: number;
  approvalRate: number;
  completionRate: number;
  averageApprovalTime: number;
  averageCompletionTime: number;
}

/**
 * Platform Analytics Aggregator
 * Aggregates platform-wide metrics for overall business intelligence
 */
@Injectable()
export class PlatformAnalyticsAggregator extends BaseAnalyticsAggregator {
  constructor() {
    super(
      undefined, // snapshotRepository will be injected via parent
      undefined, // questRepository
      undefined, // submissionRepository
      undefined, // payoutRepository
      undefined, // userRepository
    );
  }

  /**
   * Aggregate platform metrics for a specific time period
   */
  async aggregatePlatformMetrics(options: AggregationOptions): Promise<AggregationResult[]> {
    const dateRanges = this.generateDateRanges(
      options.startDate,
      options.endDate,
      options.granularity,
    );

    const results: AggregationResult[] = [];

    for (const date of dateRanges) {
      const { start, end } = this.getDateRange(date, options.granularity);

      // Skip if snapshot already exists
      if (await this.snapshotExists(date, SnapshotType.PLATFORM)) {
        continue;
      }

      const metrics = await this.calculatePlatformMetrics({
        ...options,
        startDate: start,
        endDate: end,
      });

      const result: AggregationResult = {
        date,
        type: SnapshotType.PLATFORM,
        metrics,
      };

      await this.saveSnapshot(result);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate platform metrics for a time period
   */
  private async calculatePlatformMetrics(options: AggregationOptions): Promise<PlatformMetrics> {
    const conditions = this.getCommonConditions(options);

    // Get user statistics
    const [totalUsers, newUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: conditions }),
    ]);

    // Get quest statistics
    const [totalQuests, newQuests] = await Promise.all([
      this.questRepository.count(),
      this.questRepository.count({ where: conditions }),
    ]);

    // Get submission statistics
    const [totalSubmissions, newSubmissions, approvedSubmissions] = await Promise.all([
      this.submissionRepository.count(),
      this.submissionRepository.count({ where: conditions }),
      this.submissionRepository.count({
        where: { status: SubmissionStatus.APPROVED },
      }),
    ]);

    // Get payout statistics
    const [totalPayouts, newPayouts] = await Promise.all([
      this.payoutRepository.count(),
      this.payoutRepository.count({ where: conditions }),
    ]);

    // Get financial metrics
    const [totalRevenue, totalFees] = await Promise.all([
      this.getTotalRevenue(options),
      this.getTotalFees(options),
    ]);

    // Get active users
    const activeUsers = await this.getActiveUsersCount(options);

    // Calculate derived metrics
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;
    const completionRate = await this.calculateCompletionRate(options);
    const averageApprovalTime = await this.calculateAverageApprovalTime(options);
    const averageCompletionTime = await this.calculateAverageCompletionTime(options);

    return {
      totalUsers,
      newUsers,
      totalQuests,
      newQuests,
      totalSubmissions,
      newSubmissions,
      approvedSubmissions,
      totalPayouts,
      newPayouts,
      totalRevenue,
      totalFees,
      activeUsers,
      approvalRate,
      completionRate,
      averageApprovalTime,
      averageCompletionTime,
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
   * Calculate total revenue (sum of all payouts)
   */
  private async getTotalRevenue(options: AggregationOptions): Promise<string> {
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
   * Calculate total fees (platform fees from payouts)
   */
  private async getTotalFees(options: AggregationOptions): Promise<string> {
    const result = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('SUM(CAST(payout.fee AS DECIMAL))', 'total')
      .where('payout.createdAt BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .andWhere('payout.status = :status', { status: 'completed' })
      .getRawOne();

    return result.total || '0';
  }

  /**
   * Calculate overall completion rate
   */
  private async calculateCompletionRate(options: AggregationOptions): Promise<number> {
    const [totalQuests, completedQuests] = await Promise.all([
      this.questRepository.count(),
      this.questRepository.count({
        where: { status: QuestStatus.COMPLETED },
      }),
    ]);

    return totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;
  }

  /**
   * Calculate average approval time across all submissions
   */
  private async calculateAverageApprovalTime(options: AggregationOptions): Promise<number> {
    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select([
        'submission.submittedAt',
        'submission.reviewedAt',
      ])
      .where('submission.status = :status', { status: SubmissionStatus.APPROVED })
      .andWhere('submission.submittedAt BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .andWhere('submission.reviewedAt IS NOT NULL')
      .getRawMany();

    if (submissions.length === 0) return 0;

    const totalTime = submissions.reduce((sum, sub) => {
      const submittedAt = new Date(sub.submission_submittedAt);
      const reviewedAt = new Date(sub.submission_reviewedAt);
      return sum + (reviewedAt.getTime() - submittedAt.getTime());
    }, 0);

    // Return average time in hours
    return totalTime / submissions.length / (1000 * 60 * 60);
  }

  /**
   * Calculate average completion time across all quests
   */
  private async calculateAverageCompletionTime(options: AggregationOptions): Promise<number> {
    const quests = await this.questRepository
      .createQueryBuilder('quest')
      .select([
        'quest.createdAt',
        'quest.updatedAt',
      ])
      .where('quest.status = :status', { status: QuestStatus.COMPLETED })
      .andWhere('quest.createdAt BETWEEN :start AND :end', {
        start: options.startDate,
        end: options.endDate,
      })
      .getRawMany();

    if (quests.length === 0) return 0;

    const totalTime = quests.reduce((sum, quest) => {
      const createdAt = new Date(quest.quest_createdAt);
      const updatedAt = new Date(quest.quest_updatedAt);
      return sum + (updatedAt.getTime() - createdAt.getTime());
    }, 0);

    // Return average time in days
    return totalTime / quests.length / (1000 * 60 * 60 * 24);
  }
}