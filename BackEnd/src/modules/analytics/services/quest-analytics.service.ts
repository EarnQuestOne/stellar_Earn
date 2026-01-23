import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from '../entities/quest.entity';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { Payout } from '../entities/payout.entity';
import {
  QuestAnalyticsDto,
  QuestMetrics,
  QuestSummary,
} from '../dto/quest-analytics.dto';
import { QuestAnalyticsQueryDto } from '../dto/analytics-query.dto';
import { DateRangeUtil } from '../utils/date-range.util';
import { ConversionUtil } from '../utils/conversion.util';
import { TimeSeriesDataPoint } from '../dto/platform-stats.dto';
import { CacheService } from './cache.service';

@Injectable()
export class QuestAnalyticsService {
  constructor(
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    private cacheService: CacheService,
  ) {}

  /**
   * Get quest performance analytics
   */
  async getQuestAnalytics(
    query: QuestAnalyticsQueryDto,
  ): Promise<QuestAnalyticsDto> {
    const { startDate, endDate } = DateRangeUtil.parseDateRange(
      query.startDate,
      query.endDate,
    );
    DateRangeUtil.validateMaxRange(startDate, endDate);

    const cacheKey = this.cacheService.generateKey('quests', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      status: query.status || 'all',
      questId: query.questId || 'all',
      limit: query.limit,
      sortBy: query.sortBy,
    });

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        // Build query
        const queryBuilder = this.questRepository
          .createQueryBuilder('quest')
          .leftJoinAndSelect('quest.submissions', 'submission')
          .where('quest.createdAt >= :startDate', { startDate })
          .andWhere('quest.createdAt <= :endDate', { endDate });

        if (query.status) {
          queryBuilder.andWhere('quest.status = :status', {
            status: query.status,
          });
        }

        if (query.questId) {
          queryBuilder.andWhere('quest.id = :questId', {
            questId: query.questId,
          });
        }

        const quests = await queryBuilder.take(query.limit || 20).getMany();

        const questMetrics = await Promise.all(
          quests.map((quest) => this.getQuestMetrics(quest)),
        );

        // Sort based on sortBy parameter
        this.sortQuestMetrics(questMetrics, query.sortBy || 'created_at');

        const summary = this.calculateSummary(questMetrics);

        return {
          quests: questMetrics,
          summary,
        };
      },
      300, // 5 minutes TTL
    );
  }

  private async getQuestMetrics(quest: Quest): Promise<QuestMetrics> {
    const submissions = await this.submissionRepository.find({
      where: { quest: { id: quest.id } } as any,
      relations: ['user'],
    });

    const approvedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.APPROVED,
    );
    const rejectedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.REJECTED,
    );
    const pendingSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.PENDING,
    );

    const approvalRate = ConversionUtil.calculateApprovalRate(
      approvedSubmissions.length,
      submissions.length,
    );

    const avgSubmissionToApprovalTime = ConversionUtil.calculateAverageTime(
      approvedSubmissions,
      'submittedAt',
      'reviewedAt',
    );

    const payouts = await this.payoutRepository.find({
      where: {
        submission: {
          quest: { id: quest.id },
        },
      } as any,
    });

    const totalRewardsPaid = ConversionUtil.sumBigIntStrings(
      payouts.map((p) => p.amount),
    );

    const uniqueParticipants = new Set(
      submissions.map((s) => s.user?.id).filter(Boolean),
    ).size;

    const conversionRate = ConversionUtil.calculateConversionRate(
      approvedSubmissions.length,
      submissions.length,
    );

    const submissionTimeSeries = await this.getSubmissionTimeSeries(quest.id);

    return {
      questId: quest.id,
      title: quest.title,
      status: quest.status,
      createdAt: quest.createdAt,
      totalSubmissions: submissions.length,
      approvedSubmissions: approvedSubmissions.length,
      rejectedSubmissions: rejectedSubmissions.length,
      pendingSubmissions: pendingSubmissions.length,
      approvalRate,
      avgSubmissionToApprovalTime,
      totalRewardsPaid,
      uniqueParticipants,
      conversionRate,
      submissionTimeSeries,
    };
  }

  private async getSubmissionTimeSeries(
    questId: string,
  ): Promise<TimeSeriesDataPoint[]> {
    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .select(`DATE_TRUNC('day', submission.submittedAt)`, 'date')
      .addSelect('COUNT(*)', 'newSubmissions')
      .addSelect(
        `COUNT(CASE WHEN submission.status = '${SubmissionStatus.APPROVED}' THEN 1 END)`,
        'approvedSubmissions',
      )
      .where('submission.questId = :questId', { questId })
      .groupBy(`DATE_TRUNC('day', submission.submittedAt)`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return submissions.map((s) => ({
      date: DateRangeUtil.formatDate(new Date(s.date)),
      newUsers: 0,
      newQuests: 0,
      newSubmissions: parseInt(s.newSubmissions),
      approvedSubmissions: parseInt(s.approvedSubmissions || '0'),
      totalPayouts: 0,
      rewardAmount: '0',
    }));
  }

  private sortQuestMetrics(metrics: QuestMetrics[], sortBy: string): void {
    switch (sortBy) {
      case 'submissions':
        metrics.sort((a, b) => b.totalSubmissions - a.totalSubmissions);
        break;
      case 'approval_rate':
        metrics.sort((a, b) => b.approvalRate - a.approvalRate);
        break;
      case 'completion_time':
        metrics.sort(
          (a, b) =>
            a.avgSubmissionToApprovalTime - b.avgSubmissionToApprovalTime,
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

  private calculateSummary(metrics: QuestMetrics[]): QuestSummary {
    if (metrics.length === 0) {
      return {
        totalQuests: 0,
        avgSubmissionsPerQuest: 0,
        avgApprovalRate: 0,
        avgCompletionTime: 0,
      };
    }

    const totalSubmissions = metrics.reduce(
      (sum, m) => sum + m.totalSubmissions,
      0,
    );
    const avgSubmissionsPerQuest = ConversionUtil.round(
      totalSubmissions / metrics.length,
    );

    const totalApprovalRate = metrics.reduce(
      (sum, m) => sum + m.approvalRate,
      0,
    );
    const avgApprovalRate = ConversionUtil.round(
      totalApprovalRate / metrics.length,
    );

    const completionTimes = metrics
      .map((m) => m.avgSubmissionToApprovalTime)
      .filter((t) => t > 0);
    const avgCompletionTime =
      completionTimes.length > 0
        ? ConversionUtil.calculateAverage(completionTimes)
        : 0;

    return {
      totalQuests: metrics.length,
      avgSubmissionsPerQuest,
      avgApprovalRate,
      avgCompletionTime,
    };
  }
}
