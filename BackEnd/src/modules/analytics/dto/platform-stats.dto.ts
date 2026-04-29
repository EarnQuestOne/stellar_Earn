import { ApiProperty } from '@nestjs/swagger';

export class TimeSeriesDataPoint {
  @ApiProperty({
    description: 'Date of the data point',
    example: '2026-01-23',
  })
  date: string;

  @ApiProperty({
    description: 'Number of new users',
    example: 25,
  })
  newUsers: number;

  @ApiProperty({
    description: 'Number of new quests created',
    example: 5,
  })
  newQuests: number;

  @ApiProperty({
    description: 'Number of new submissions',
    example: 30,
  })
  newSubmissions: number;

  @ApiProperty({
    description: 'Number of approved submissions',
    example: 25,
  })
  approvedSubmissions: number;

  @ApiProperty({
    description: 'Number of payouts completed',
    example: 20,
  })
  totalPayouts: number;

  @ApiProperty({
    description: 'Total reward amount distributed',
    example: '150.5',
  })
  rewardAmount: string;
}

export class QuestsByStatus {
  @ApiProperty({
    description: 'Number of active quests',
    example: 15,
  })
  Active: number;

  @ApiProperty({
    description: 'Number of paused quests',
    example: 3,
  })
  Paused: number;

  @ApiProperty({
    description: 'Number of completed quests',
    example: 50,
  })
  Completed: number;

  @ApiProperty({
    description: 'Number of expired quests',
    example: 7,
  })
  Expired: number;
}

export class SubmissionsByStatus {
  @ApiProperty({
    description: 'Number of pending submissions',
    example: 20,
  })
  Pending: number;

  @ApiProperty({
    description: 'Number of approved submissions',
    example: 150,
  })
  Approved: number;

  @ApiProperty({
    description: 'Number of rejected submissions',
    example: 30,
  })
  Rejected: number;

  @ApiProperty({
    description: 'Number of paid submissions',
    example: 140,
  })
  Paid: number;
}

export class PlatformStatsDto {
  @ApiProperty({
    description: 'Total number of registered users',
    example: 1000,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of quests created',
    example: 75,
  })
  totalQuests: number;

  @ApiProperty({
    description: 'Total submissions across all quests',
    example: 500,
  })
  totalSubmissions: number;

  @ApiProperty({
    description: 'Total approved submissions',
    example: 400,
  })
  approvedSubmissions: number;

  @ApiProperty({
    description: 'Total payouts completed',
    example: 350,
  })
  totalPayouts: number;

  @ApiProperty({
    description: 'Total reward amount distributed',
    example: '3500.5',
  })
  totalRewardsDistributed: string;

  @ApiProperty({
    description: 'Overall submission approval rate (0-100)',
    example: 80,
  })
  approvalRate: number;

  @ApiProperty({
    description: 'Average time from submission to approval (hours)',
    example: 2.5,
  })
  avgApprovalTime: number;

  @ApiProperty({
    description: 'Number of active users in date range',
    example: 250,
  })
  activeUsers: number;

  @ApiProperty({
    description: 'Time-series data',
    type: [TimeSeriesDataPoint],
  })
  timeSeries: TimeSeriesDataPoint[];

  @ApiProperty({
    description: 'Quest status breakdown',
    type: QuestsByStatus,
  })
  questsByStatus: QuestsByStatus;

  @ApiProperty({
    description: 'Submission status breakdown',
    type: SubmissionsByStatus,
  })
  submissionsByStatus: SubmissionsByStatus;
}
