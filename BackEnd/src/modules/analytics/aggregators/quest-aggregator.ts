import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest, QuestStatus } from '../entities/quest.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { BaseAnalyticsAggregator, AggregationOptions, AggregationResult } from './base-aggregator';
import { SnapshotType } from '../entities/analytics-snapshot.entity';

export interface QuestMetrics {
  totalQuests: number;
  activeQuests: number;
  completedQuests: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  completionRate: number;
  approvalRate: number;
  averageCompletionTime: number;
  totalRewardPool: string;
  averageRewardPerQuest: string;
}

/**
 * Quest Analytics Aggregator
 * Aggregates quest-related metrics including completion rates, submission stats, and performance
 */
@Injectable()
export class QuestAnalyticsAggregator extends BaseAnalyticsAggregator {
  constructor(
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
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
   * Aggregate quest metrics for a specific time period
   */
  async aggregateQuestMetrics(options: AggregationOptions): Promise<AggregationResult[]> {
    const dateRanges = this.generateDateRanges(
      options.startDate,
      options.endDate,
      options.granularity,
    );

    const results: AggregationResult[] = [];

    for (const date of dateRanges) {
      const { start, end } = this.getDateRange(date, options.granularity);

      // Skip if snapshot already exists
      if (await this.snapshotExists(date, SnapshotType.QUEST)) {
        continue;
      }

      const metrics = await this.calculateQuestMetrics({
        ...options,
        startDate: start,
        endDate: end,
      });

      const result: AggregationResult = {
        date,
        type: SnapshotType.QUEST,
        metrics,
      };

      await this.saveSnapshot(result);
      results.push(result);
    }

    return results;
  }

  /**
   * Aggregate metrics for a specific quest
   */
  async aggregateQuestMetricsById(
    questId: string,
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
      if (await this.snapshotExists(date, SnapshotType.QUEST, questId)) {
        continue;
      }

      const metrics = await this.calculateQuestMetricsById(questId, {
        ...options,
        startDate: start,
        endDate: end,
      });

      const result: AggregationResult = {
        date,
        type: SnapshotType.QUEST,
        referenceId: questId,
        metrics,
      };

      await this.saveSnapshot(result);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate quest metrics for a time period
   */
  private async calculateQuestMetrics(options: AggregationOptions): Promise<QuestMetrics> {
    const conditions = this.getCommonConditions(options);

    // Get quest statistics
    const [totalQuests, activeQuests, completedQuests] = await Promise.all([
      this.questRepository.count({ where: conditions }),
      this.questRepository.count({
        where: { ...conditions, status: QuestStatus.ACTIVE },
      }),
      this.questRepository.count({
        where: { ...conditions, status: QuestStatus.COMPLETED },
      }),
    ]);

    // Get submission statistics
    const [totalSubmissions, approvedSubmissions, rejectedSubmissions] = await Promise.all([
      this.submissionRepository.count({ where: conditions }),
      this.submissionRepository.count({
        where: { ...conditions, status: SubmissionStatus.APPROVED },
      }),
      this.submissionRepository.count({
        where: { ...conditions, status: SubmissionStatus.REJECTED },
      }),
    ]);

    // Calculate rates
    const completionRate = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

    // Calculate average completion time
    const averageCompletionTime = await this.calculateAverageCompletionTime(options);

    // Calculate reward metrics
    const rewardMetrics = await this.calculateRewardMetrics(options);

    return {
      totalQuests,
      activeQuests,
      completedQuests,
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      completionRate,
      approvalRate,
      averageCompletionTime,
      ...rewardMetrics,
    };
  }

  /**
   * Calculate metrics for a specific quest
   */
  private async calculateQuestMetricsById(
    questId: string,
    options: AggregationOptions,
  ): Promise<QuestMetrics> {
    const conditions = {
      ...this.getCommonConditions(options),
      questId,
    };

    // Get quest details
    const quest = await this.questRepository.findOne({
      where: { id: questId },
    });

    if (!quest) {
      throw new Error(`Quest with ID ${questId} not found`);
    }

    // Get submission statistics for this quest
    const [totalSubmissions, approvedSubmissions, rejectedSubmissions] = await Promise.all([
      this.submissionRepository.count({ where: conditions }),
      this.submissionRepository.count({
        where: { ...conditions, status: SubmissionStatus.APPROVED },
      }),
      this.submissionRepository.count({
        where: { ...conditions, status: SubmissionStatus.REJECTED },
      }),
    ]);

    // Calculate rates
    const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

    // Calculate average completion time for this quest
    const averageCompletionTime = await this.calculateAverageCompletionTimeByQuest(questId, options);

    return {
      totalQuests: 1,
      activeQuests: quest.status === QuestStatus.ACTIVE ? 1 : 0,
      completedQuests: quest.status === QuestStatus.COMPLETED ? 1 : 0,
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      completionRate: quest.status === QuestStatus.COMPLETED ? 100 : 0,
      approvalRate,
      averageCompletionTime,
      totalRewardPool: quest.rewardAmount || '0',
      averageRewardPerQuest: quest.rewardAmount || '0',
    };
  }

  /**
   * Calculate average completion time across all quests
   */
  private async calculateAverageCompletionTime(options: AggregationOptions): Promise<number> {
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
   * Calculate average completion time for a specific quest
   */
  private async calculateAverageCompletionTimeByQuest(
    questId: string,
    options: AggregationOptions,
  ): Promise<number> {
    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select([
        'submission.submittedAt',
        'submission.reviewedAt',
      ])
      .where('submission.questId = :questId', { questId })
      .andWhere('submission.status = :status', { status: SubmissionStatus.APPROVED })
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
   * Calculate reward-related metrics
   */
  private async calculateRewardMetrics(options: AggregationOptions): Promise<{
    totalRewardPool: string;
    averageRewardPerQuest: string;
  }> {
    const quests = await this.questRepository.find({
      where: this.getCommonConditions(options),
      select: ['rewardAmount'],
    });

    if (quests.length === 0) {
      return { totalRewardPool: '0', averageRewardPerQuest: '0' };
    }

    const totalReward = quests.reduce((sum, quest) => {
      return sum + parseFloat(quest.rewardAmount || '0');
    }, 0);

    const averageReward = totalReward / quests.length;

    return {
      totalRewardPool: totalReward.toString(),
      averageRewardPerQuest: averageReward.toString(),
    };
  }
}