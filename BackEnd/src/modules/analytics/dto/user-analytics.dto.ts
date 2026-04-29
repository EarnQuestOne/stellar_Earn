import { ApiProperty } from '@nestjs/swagger';

export class ActivityDataPoint {
  @ApiProperty({
    description: 'Activity date',
    example: '2026-01-23',
  })
  date: string;

  @ApiProperty({
    description: 'Number of submissions on this date',
    example: 5,
  })
  submissions: number;

  @ApiProperty({
    description: 'Number of quests completed on this date',
    example: 3,
  })
  questsCompleted: number;

  @ApiProperty({
    description: 'XP gained on this date',
    example: 150,
  })
  xpGained: number;
}

export class UserMetrics {
  @ApiProperty({
    description: 'User Stellar address',
    example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    nullable: true,
  })
  stellarAddress: string | null;

  @ApiProperty({
    description: 'User display name',
    example: 'stellar_earner',
    nullable: true,
  })
  username: string;

  @ApiProperty({
    description: 'Total experience points',
    example: 1500,
  })
  totalXp: number;

  @ApiProperty({
    description: 'User level',
    example: 5,
  })
  level: number;

  @ApiProperty({
    description: 'Number of quests completed',
    example: 10,
  })
  questsCompleted: number;

  @ApiProperty({
    description: 'Total number of submissions',
    example: 15,
  })
  totalSubmissions: number;

  @ApiProperty({
    description: 'Number of approved submissions',
    example: 12,
  })
  approvedSubmissions: number;

  @ApiProperty({
    description: 'Approval rate percentage (0-100)',
    example: 80,
  })
  approvalRate: number;

  @ApiProperty({
    description: 'Total rewards earned',
    example: '100.5',
  })
  totalRewardsEarned: string;

  @ApiProperty({
    description: 'Average completion time (hours)',
    example: 2.5,
  })
  avgCompletionTime: number;

  @ApiProperty({
    description: 'Last activity date',
    example: '2026-01-23T12:34:56.000Z',
  })
  lastActiveAt: Date;

  @ApiProperty({
    description: 'Account creation date',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Earned badges',
    type: [String],
    example: ['early_adopter', 'quest_master'],
  })
  badges: string[];

  @ApiProperty({
    description: 'Activity history',
    type: [ActivityDataPoint],
  })
  activityHistory: ActivityDataPoint[];

  @ApiProperty({
    description: 'User role',
    example: 'USER',
  })
  role: string;

  @ApiProperty({
    description: 'Number of failed quests',
    example: 2,
  })
  failedQuests: number;

  @ApiProperty({
    description: 'Success rate percentage (0-100)',
    example: 83.33,
  })
  successRate: number;

  @ApiProperty({
    description: 'Total earned amount',
    example: '100.5',
  })
  totalEarned: string;

  @ApiProperty({
    description: 'User bio',
    example: 'Stellar quest enthusiast',
    nullable: true,
  })
  bio?: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Privacy level',
    example: 'PUBLIC',
    nullable: true,
  })
  privacyLevel?: string;

  @ApiProperty({
    description: 'Social links',
    type: 'object',
    example: { twitter: '@user', github: 'user' },
    nullable: true,
  })
  socialLinks?: Record<string, any>;
}

export class CohortAnalysis {
  @ApiProperty({
    description: 'New users in this period',
    example: 50,
  })
  newUsersThisPeriod: number;

  @ApiProperty({
    description: 'Returning users',
    example: 200,
  })
  returningUsers: number;

  @ApiProperty({
    description: 'Churned users',
    example: 10,
  })
  churnedUsers: number;
}

export class UserSummary {
  @ApiProperty({
    description: 'Total number of users',
    example: 1000,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Number of active users',
    example: 250,
  })
  activeUsers: number;

  @ApiProperty({
    description: 'Average quests per user',
    example: 5,
  })
  avgQuestsPerUser: number;

  @ApiProperty({
    description: 'Average XP per user',
    example: 750,
  })
  avgXpPerUser: number;

  @ApiProperty({
    description: 'Retention rate percentage (0-100)',
    example: 85,
  })
  retentionRate: number;

  @ApiProperty({
    description: 'Average success rate percentage (0-100)',
    example: 80,
  })
  avgSuccessRate: number;
}

export class UserAnalyticsDto {
  @ApiProperty({ description: 'List of user metrics', type: [UserMetrics] })
  users: UserMetrics[];

  @ApiProperty({ description: 'Summary statistics', type: UserSummary })
  summary: UserSummary;

  @ApiProperty({ description: 'Cohort analysis', type: CohortAnalysis })
  cohortAnalysis: CohortAnalysis;

  @ApiProperty({
    description: 'User growth time-series',
    type: [ActivityDataPoint],
  })
  userGrowth: ActivityDataPoint[];
}
