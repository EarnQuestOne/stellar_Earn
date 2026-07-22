import { User } from '../entities/user.entity';
import {
  UserResponseDto,
  LeaderboardUserDto,
  UserStatsResponseDto,
  UserQuestDto,
} from '../dto/user-response.dto';
import { UserRole } from '../../auth/enums/user-role.enum';

/**
 * User Mapper
 *
 * Explicit mapper functions to convert between User entities and DTOs.
 * This provides a clean separation of concerns and makes mapping logic testable.
 */
export class UserMapper {
  /**
   * Convert a User entity to a UserResponseDto
   * @param user - The user entity to convert
   * @returns The user response DTO
   */
  static toDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.stellarAddress = user.stellarAddress ?? '';
    dto.username = user.username;
    dto.email = user.email;
    dto.role = user.role as unknown as UserRole;
    dto.xp = user.xp;
    dto.level = user.level;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  /**
   * Convert an array of User entities to UserResponseDto array
   * @param users - Array of user entities to convert
   * @returns Array of user response DTOs
   */
  static toDtoArray(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toDto(user));
  }

  /**
   * Convert a User entity to a LeaderboardUserDto
   * @param user - The user entity to convert
   * @param rank - The user's rank on the leaderboard
   * @returns The leaderboard user DTO
   */
  static toLeaderboardDto(user: User, rank: number): LeaderboardUserDto {
    const dto = new LeaderboardUserDto();
    dto.id = user.id;
    dto.stellarAddress = user.stellarAddress ?? '';
    dto.username = user.username;
    dto.xp = user.xp;
    dto.level = user.level;
    dto.rank = rank;
    return dto;
  }

  /**
   * Convert user statistics to UserStatsResponseDto
   * @param stats - User statistics object
   * @returns The user stats response DTO
   */
  static toStatsDto(stats: {
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    questsCompleted: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    approvalRate: number;
    totalRewardsEarned: number;
    currentStreak: number;
    longestStreak: number;
  }): UserStatsResponseDto {
    const dto = new UserStatsResponseDto();
    dto.totalXp = stats.totalXp;
    dto.level = stats.level;
    dto.xpToNextLevel = stats.xpToNextLevel;
    dto.questsCompleted = stats.questsCompleted;
    dto.totalSubmissions = stats.totalSubmissions;
    dto.approvedSubmissions = stats.approvedSubmissions;
    dto.rejectedSubmissions = stats.rejectedSubmissions;
    dto.approvalRate = stats.approvalRate;
    dto.totalRewardsEarned = stats.totalRewardsEarned;
    dto.currentStreak = stats.currentStreak;
    dto.longestStreak = stats.longestStreak;
    return dto;
  }

  /**
   * Convert user quest data to UserQuestDto
   * @param questData - User quest data
   * @returns The user quest DTO
   */
  static toUserQuestDto(questData: {
    id: string;
    title: string;
    rewardAmount: number;
    status: string;
    submittedAt: Date;
  }): UserQuestDto {
    const dto = new UserQuestDto();
    dto.id = questData.id;
    dto.title = questData.title;
    dto.rewardAmount = questData.rewardAmount;
    dto.status = questData.status;
    dto.submittedAt = questData.submittedAt;
    return dto;
  }
}
