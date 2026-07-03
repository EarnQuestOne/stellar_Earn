import { describe, it, expect } from 'vitest';
import { ProfileMapper } from '../profile.mapper';
import type { UserResponse, UserStatsResponse } from '../../types/api.types';
import type { UserProfile, ProfileStats } from '../../types/profile';

describe('ProfileMapper', () => {
  const mockApiUser: UserResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    stellarAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
    xp: 1500,
    level: 5,
    questsCompleted: 10,
    badges: ['badge1', 'badge2'],
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    socialLinks: {
      twitter: 'https://twitter.com/test',
      github: 'https://github.com/test',
    },
    successRate: 80,
    totalEarned: '100.5',
    lastActiveAt: '2026-01-24T08:00:00.000Z',
    createdAt: '2026-01-23T12:34:56.000Z',
    updatedAt: '2026-01-24T08:00:00.000Z',
  };

  const mockApiStats: UserStatsResponse = {
    xp: 1500,
    level: 5,
    questsCompleted: 10,
    failedQuests: 2,
    successRate: 80,
    totalEarned: '100.5',
    badges: ['badge1', 'badge2'],
    lastActiveAt: '2026-01-24T08:00:00.000Z',
  };

  describe('toDomain', () => {
    it('should convert API UserResponse to UI UserProfile domain model', () => {
      const result = ProfileMapper.toDomain(mockApiUser, false);

      expect(result.id).toBe(mockApiUser.id);
      expect(result.username).toBe(mockApiUser.username);
      expect(result.stellarAddress).toBe(mockApiUser.stellarAddress);
      expect(result.avatar).toBe(mockApiUser.avatarUrl);
      expect(result.bio).toBe(mockApiUser.bio);
      expect(result.level).toBe(mockApiUser.level);
      expect(result.xp).toBe(mockApiUser.xp);
      expect(result.totalEarnings).toBe(parseFloat(mockApiUser.totalEarned));
      expect(result.questsCompleted).toBe(mockApiUser.questsCompleted);
      expect(result.isOwnProfile).toBe(false);
    });

    it('should handle isOwnProfile flag', () => {
      const result = ProfileMapper.toDomain(mockApiUser, true);
      expect(result.isOwnProfile).toBe(true);
    });

    it('should handle null stellarAddress', () => {
      const userWithNullAddress = { ...mockApiUser, stellarAddress: null };
      const result = ProfileMapper.toDomain(userWithNullAddress, false);
      expect(result.stellarAddress).toBe('');
    });
  });

  describe('toStatsDomain', () => {
    it('should convert API UserStatsResponse to UI ProfileStats domain model', () => {
      const result = ProfileMapper.toStatsDomain(mockApiStats);

      expect(result.xp).toBe(mockApiStats.xp);
      expect(result.level).toBe(mockApiStats.level);
      expect(result.totalEarnings).toBe(parseFloat(mockApiStats.totalEarned));
      expect(result.questsCompleted).toBe(mockApiStats.questsCompleted);
    });
  });

  describe('toApi', () => {
    it('should convert UI UserProfile to API UserResponse', () => {
      const domainProfile: UserProfile = {
        id: mockApiUser.id,
        username: mockApiUser.username,
        stellarAddress: mockApiUser.stellarAddress || '',
        avatar: mockApiUser.avatarUrl,
        bio: mockApiUser.bio,
        level: mockApiUser.level,
        xp: mockApiUser.xp,
        totalEarnings: parseFloat(mockApiUser.totalEarned),
        questsCompleted: mockApiUser.questsCompleted,
        currentStreak: 5,
        joinDate: mockApiUser.createdAt,
        lastActive: mockApiUser.lastActiveAt || mockApiUser.updatedAt,
        isFollowing: false,
        followersCount: 10,
        followingCount: 5,
        isOwnProfile: false,
      };

      const result = ProfileMapper.toApi(domainProfile);

      expect(result.id).toBe(domainProfile.id);
      expect(result.username).toBe(domainProfile.username);
      expect(result.stellarAddress).toBe(domainProfile.stellarAddress);
      expect(result.xp).toBe(domainProfile.xp);
      expect(result.level).toBe(domainProfile.level);
    });
  });
});
