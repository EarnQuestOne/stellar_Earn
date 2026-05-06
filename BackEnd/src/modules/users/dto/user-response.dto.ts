import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  })
  stellarAddress: string;

  @ApiProperty({
    description: 'Username',
    example: 'stellar_earner',
    required: false,
  })
  username?: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.USER,
  })
  role: Role;

  @ApiProperty({
    description: 'User XP points',
    example: 1500,
  })
  xp: number;

  @ApiProperty({
    description: 'User level',
    example: 5,
  })
  level: number;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-24T08:00:00.000Z',
  })
  updatedAt: Date;
}

export class LeaderboardUserDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  stellarAddress: string;

  @ApiProperty({
    description: 'Username',
    example: 'stellar_earner',
    required: false,
  })
  username?: string;

  @ApiProperty({
    description: 'User XP points',
    example: 1500,
  })
  xp: number;

  @ApiProperty({
    description: 'User level',
    example: 5,
  })
  level: number;

  @ApiProperty({
    description: 'Rank on leaderboard',
    example: 1,
  })
  rank: number;
}

export class LeaderboardResponseDto {
  @ApiProperty({
    description: 'Array of leaderboard users',
    type: [LeaderboardUserDto],
  })
  users: LeaderboardUserDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2,
  })
  totalPages: number;
}

export class UserStatsResponseDto {
  @ApiProperty({
    description: 'Total XP earned',
    example: 1500,
  })
  totalXp: number;

  @ApiProperty({
    description: 'Current level',
    example: 5,
  })
  level: number;

  @ApiProperty({
    description: 'XP needed for next level',
    example: 500,
  })
  xpToNextLevel: number;

  @ApiProperty({
    description: 'Total quests completed',
    example: 10,
  })
  questsCompleted: number;

  @ApiProperty({
    description: 'Total submissions made',
    example: 15,
  })
  totalSubmissions: number;

  @ApiProperty({
    description: 'Number of approved submissions',
    example: 12,
  })
  approvedSubmissions: number;

  @ApiProperty({
    description: 'Number of rejected submissions',
    example: 3,
  })
  rejectedSubmissions: number;

  @ApiProperty({
    description: 'Approval rate percentage',
    example: 80,
  })
  approvalRate: number;

  @ApiProperty({
    description: 'Total rewards earned in XLM',
    example: 100.5,
  })
  totalRewardsEarned: number;

  @ApiProperty({
    description: 'Current streak of completed quests',
    example: 5,
  })
  currentStreak: number;

  @ApiProperty({
    description: 'Longest streak achieved',
    example: 10,
  })
  longestStreak: number;
}

export class UserQuestDto {
  @ApiProperty({
    description: 'Quest unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Quest title',
    example: 'Complete KYC Verification',
  })
  title: string;

  @ApiProperty({
    description: 'Quest reward amount',
    example: 10.5,
  })
  rewardAmount: number;

  @ApiProperty({
    description: 'Submission status',
    example: 'APPROVED',
  })
  status: string;

  @ApiProperty({
    description: 'Submission timestamp',
    example: '2026-01-23T12:34:56.000Z',
  })
  submittedAt: Date;
}

export class UserQuestHistoryResponseDto {
  @ApiProperty({
    description: 'Array of user quests',
    type: [UserQuestDto],
  })
  quests: UserQuestDto[];

  @ApiProperty({
    description: 'Total number of quests',
    example: 20,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages: number;
}

export class UserProfileUpdateResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Updated user data',
    type: UserResponseDto,
  })
  data: UserResponseDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Profile updated successfully',
  })
  message: string;
}

export class DataExportResponseDto {
  @ApiProperty({
    description: 'Export request ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Export status',
    example: 'QUEUED',
  })
  status: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Export request queued. You will be notified when ready.',
  })
  message: string;
}

export class AdminListResponseDto {
  @ApiProperty({
    description: 'Array of admin users',
    type: [UserResponseDto],
  })
  admins: UserResponseDto[];

  @ApiProperty({
    description: 'Total number of admins',
    example: 5,
  })
  total: number;
}
