import { ApiProperty } from '@nestjs/swagger';

export class ActivityDataPoint {
  @ApiProperty({ description: 'Activity date' })
  date: string;

  @ApiProperty({ description: 'Number of submissions on this date' })
  submissions: number;

  @ApiProperty({ description: 'Number of quests completed on this date' })
  questsCompleted: number;

  @ApiProperty({ description: 'XP gained on this date' })
  xpGained: number;
}

export class UserMetrics {
  @ApiProperty({ description: 'User Stellar address' })
  stellarAddress: string;

  @ApiProperty({ description: 'User display name', nullable: true })
  username: string;

  @ApiProperty({ description: 'Total experience points' })
  totalXp: number;

  @ApiProperty({ description: 'User level' })
  level: number;

  @ApiProperty({ description: 'Number of quests completed' })
  questsCompleted: number;

  @ApiProperty({ description: 'Total number of submissions' })
  totalSubmissions: number;

  @ApiProperty({ description: 'Number of approved submissions' })
  approvedSubmissions: number;

  @ApiProperty({ description: 'Approval rate percentage (0-100)' })
  approvalRate: number;

  @ApiProperty({ description: 'Total rewards earned' })
  totalRewardsEarned: string;

  @ApiProperty({ description: 'Average completion time (hours)' })
  avgCompletionTime: number;

  @ApiProperty({ description: 'Last activity date' })
  lastActiveAt: Date;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Earned badges', type: [String] })
  badges: string[];

  @ApiProperty({ description: 'Activity history', type: [ActivityDataPoint] })
  activityHistory: ActivityDataPoint[];
}

export class CohortAnalysis {
  @ApiProperty({ description: 'New users in this period' })
  newUsersThisPeriod: number;

  @ApiProperty({ description: 'Returning users' })
  returningUsers: number;

  @ApiProperty({ description: 'Churned users' })
  churnedUsers: number;
}

export class UserSummary {
  @ApiProperty({ description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ description: 'Number of active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Average quests per user' })
  avgQuestsPerUser: number;

  @ApiProperty({ description: 'Average XP per user' })
  avgXpPerUser: number;

  @ApiProperty({ description: 'Retention rate percentage (0-100)' })
  retentionRate: number;
}

export class UserAnalyticsDto {
  @ApiProperty({ description: 'List of user metrics', type: [UserMetrics] })
  users: UserMetrics[];

  @ApiProperty({ description: 'Summary statistics', type: UserSummary })
  summary: UserSummary;

  @ApiProperty({ description: 'Cohort analysis', type: CohortAnalysis })
  cohortAnalysis: CohortAnalysis;

  @ApiProperty({ description: 'User growth time-series', type: [ActivityDataPoint] })
  userGrowth: ActivityDataPoint[];
}
