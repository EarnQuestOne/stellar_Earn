import { ApiProperty } from '@nestjs/swagger';
import { TimeSeriesDataPoint } from './platform-stats.dto';

export class QuestMetrics {
  @ApiProperty({
    description: 'Quest ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  questId: string;

  @ApiProperty({
    description: 'Quest title',
    example: 'Complete KYC Verification',
  })
  title: string;

  @ApiProperty({
    description: 'Quest status',
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Quest creation date',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Total number of submissions',
    example: 50,
  })
  totalSubmissions: number;

  @ApiProperty({
    description: 'Number of approved submissions',
    example: 40,
  })
  approvedSubmissions: number;

  @ApiProperty({
    description: 'Number of rejected submissions',
    example: 5,
  })
  rejectedSubmissions: number;

  @ApiProperty({
    description: 'Number of pending submissions',
    example: 5,
  })
  pendingSubmissions: number;

  @ApiProperty({
    description: 'Approval rate percentage (0-100)',
    example: 80,
  })
  approvalRate: number;

  @ApiProperty({
    description: 'Average time from submission to approval (hours)',
    example: 2.5,
  })
  avgSubmissionToApprovalTime: number;

  @ApiProperty({
    description: 'Total rewards paid out for this quest',
    example: '400.0',
  })
  totalRewardsPaid: string;

  @ApiProperty({
    description: 'Number of unique participants',
    example: 45,
  })
  uniqueParticipants: number;

  @ApiProperty({
    description: 'Conversion rate percentage',
    example: 90,
  })
  conversionRate: number;

  @ApiProperty({
    description: 'Submission time-series data',
    type: [TimeSeriesDataPoint],
  })
  submissionTimeSeries: TimeSeriesDataPoint[];
}

export class QuestSummary {
  @ApiProperty({
    description: 'Total number of quests',
    example: 75,
  })
  totalQuests: number;

  @ApiProperty({
    description: 'Total unique participants across all quests',
    example: 500,
  })
  totalUniqueParticipants: number;

  @ApiProperty({
    description: 'Average submissions per quest',
    example: 15,
  })
  avgSubmissionsPerQuest: number;

  @ApiProperty({
    description: 'Average approval rate across all quests',
    example: 85,
  })
  avgApprovalRate: number;

  @ApiProperty({
    description: 'Average completion time (hours)',
    example: 3.0,
  })
  avgCompletionTime: number;

  @ApiProperty({
    description: 'Total rewards paid out across all quests',
    example: '3500.5',
  })
  totalRewardsPaid: string;
}

export class QuestAnalyticsDto {
  @ApiProperty({ description: 'List of quest metrics', type: [QuestMetrics] })
  quests: QuestMetrics[];

  @ApiProperty({ description: 'Summary statistics', type: QuestSummary })
  summary: QuestSummary;
}
