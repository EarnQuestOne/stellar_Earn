import { ApiProperty } from '@nestjs/swagger';
import { TimeSeriesDataPoint } from './platform-stats.dto';

export class QuestMetrics {
  @ApiProperty({ description: 'Quest ID' })
  questId: string;

  @ApiProperty({ description: 'Quest title' })
  title: string;

  @ApiProperty({ description: 'Quest status' })
  status: string;

  @ApiProperty({ description: 'Quest creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Total number of submissions' })
  totalSubmissions: number;

  @ApiProperty({ description: 'Number of approved submissions' })
  approvedSubmissions: number;

  @ApiProperty({ description: 'Number of rejected submissions' })
  rejectedSubmissions: number;

  @ApiProperty({ description: 'Number of pending submissions' })
  pendingSubmissions: number;

  @ApiProperty({ description: 'Approval rate percentage (0-100)' })
  approvalRate: number;

  @ApiProperty({ description: 'Average time from submission to approval (hours)' })
  avgSubmissionToApprovalTime: number;

  @ApiProperty({ description: 'Total rewards paid out for this quest' })
  totalRewardsPaid: string;

  @ApiProperty({ description: 'Number of unique participants' })
  uniqueParticipants: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Submission time-series data', type: [TimeSeriesDataPoint] })
  submissionTimeSeries: TimeSeriesDataPoint[];
}

export class QuestSummary {
  @ApiProperty({ description: 'Total number of quests' })
  totalQuests: number;

  @ApiProperty({ description: 'Average submissions per quest' })
  avgSubmissionsPerQuest: number;

  @ApiProperty({ description: 'Average approval rate across all quests' })
  avgApprovalRate: number;

  @ApiProperty({ description: 'Average completion time (hours)' })
  avgCompletionTime: number;
}

export class QuestAnalyticsDto {
  @ApiProperty({ description: 'List of quest metrics', type: [QuestMetrics] })
  quests: QuestMetrics[];

  @ApiProperty({ description: 'Summary statistics', type: QuestSummary })
  summary: QuestSummary;
}
