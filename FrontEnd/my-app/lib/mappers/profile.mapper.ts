import type { UserResponse, UserStatsResponse } from '../types/api.types';
import type { UserProfile, ProfileStats } from '../types/profile';

/**
 * Profile Mapper
 *
 * Explicit mapper functions to convert between API DTOs and UI domain models.
 * This provides a clean separation of concerns and makes mapping logic testable.
 */
export class ProfileMapper {
  /**
   * Convert API UserResponse to UI UserProfile domain model
   * @param apiUser - The API user response
   * @param isOwnProfile - Whether this is the current user's profile
   * @returns The UI user profile domain model
   */
  static toDomain(apiUser: UserResponse, isOwnProfile = false): UserProfile {
    return {
      id: apiUser.id,
      username: apiUser.username,
      stellarAddress: apiUser.stellarAddress || '',
      avatar: apiUser.avatarUrl,
      bio: apiUser.bio,
      level: apiUser.level,
      xp: apiUser.xp,
      totalEarnings: parseFloat(apiUser.totalEarned || '0'),
      questsCompleted: apiUser.questsCompleted,
      currentStreak: 0, // Not available in API response
      joinDate: apiUser.createdAt,
      lastActive: apiUser.lastActiveAt || apiUser.updatedAt,
      isFollowing: false, // Not available in API response
      followersCount: 0, // Not available in API response
      followingCount: 0, // Not available in API response
      isOwnProfile,
    };
  }

  /**
   * Convert API UserStatsResponse to UI ProfileStats domain model
   * @param apiStats - The API user stats response
   * @returns The UI profile stats domain model
   */
  static toStatsDomain(apiStats: UserStatsResponse): ProfileStats {
    return {
      xp: apiStats.xp,
      level: apiStats.level,
      totalEarnings: parseFloat(apiStats.totalEarned || '0'),
      questsCompleted: apiStats.questsCompleted,
      currentStreak: 0, // Not available in API response
      followersCount: 0, // Not available in API response
      followingCount: 0, // Not available in API response
      joinDate: apiStats.lastActiveAt || new Date().toISOString(),
    };
  }

  /**
   * Convert UI UserProfile to API UserResponse
   * @param domainProfile - The UI user profile domain model
   * @returns The API user response
   */
  static toApi(domainProfile: UserProfile): UserResponse {
    return {
      id: domainProfile.id,
      stellarAddress: domainProfile.stellarAddress,
      username: domainProfile.username,
      role: 'USER',
      xp: domainProfile.xp,
      level: domainProfile.level,
      questsCompleted: domainProfile.questsCompleted,
      badges: [],
      avatarUrl: domainProfile.avatar,
      bio: domainProfile.bio,
      successRate: 0,
      totalEarned: domainProfile.totalEarnings.toString(),
      createdAt: domainProfile.joinDate,
      updatedAt: domainProfile.lastActive,
    };
  }
}
