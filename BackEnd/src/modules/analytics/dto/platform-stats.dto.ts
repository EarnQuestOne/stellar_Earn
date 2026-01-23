import { ApiProperty } from '@nestjs/swagger';

export class TimeSeriesDataPoint {
  @ApiProperty({ description: 'Date of the data point' })
  date: string;

  @ApiProperty({ description: 'Number of new users' })
  newUsers: number;

  @ApiProperty({ description: 'Number of new quests created' })
  newQuests: number;

  @ApiProperty({ description: 'Number of new submissions' })
  newSubmissions: number;

  @ApiProperty({ description: 'Number of approved submissions' })
  approvedSubmissions: number;

  @ApiProperty({ description: 'Number of payouts completed' })
  totalPayouts: number;

  @ApiProperty({ description: 'Total reward amount distributed' })
  rewardAmount: string;
}

export class QuestsByStatus {
  @ApiProperty({ description: 'Number of active quests' })
  Active: number;

  @ApiProperty({ description: 'Number of paused quests' })
  Paused: number;

  @ApiProperty({ description: 'Number of completed quests' })
  Completed: number;

  @ApiProperty({ description: 'Number of expired quests' })
  Expired: number;
}

export class SubmissionsByStatus {
  @ApiProperty({ description: 'Number of pending submissions' })
  Pending: number;

  @ApiProperty({ description: 'Number of approved submissions' })
  Approved: number;

  @ApiProperty({ description: 'Number of rejected submissions' })
  Rejected: number;

  @ApiProperty({ description: 'Number of paid submissions' })
  Paid: number;
}

export class PlatformStatsDto {
  @ApiProperty({ description: 'Total number of registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total number of quests created' })
  totalQuests: number;

  @ApiProperty({ description: 'Total submissions across all quests' })
  totalSubmissions: number;

  @ApiProperty({ description: 'Total approved submissions' })
  approvedSubmissions: number;

  @ApiProperty({ description: 'Total payouts completed' })
  totalPayouts: number;

  @ApiProperty({ description: 'Total reward amount distributed' })
  totalRewardsDistributed: string;

  @ApiProperty({ description: 'Overall submission approval rate (0-100)' })
  approvalRate: number;

  @ApiProperty({ description: 'Average time from submission to approval (hours)' })
  avgApprovalTime: number;

  @ApiProperty({ description: 'Number of active users in date range' })
  activeUsers: number;

  @ApiProperty({ description: 'Time-series data', type: [TimeSeriesDataPoint] })
  timeSeries: TimeSeriesDataPoint[];

  @ApiProperty({ description: 'Quest status breakdown', type: QuestsByStatus })
  questsByStatus: QuestsByStatus;

  @ApiProperty({ description: 'Submission status breakdown', type: SubmissionsByStatus })
  submissionsByStatus: SubmissionsByStatus;
}
