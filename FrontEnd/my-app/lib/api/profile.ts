// API utilities for user profile data

import type {
  ProfileData,
  UserProfile,
  ProfileStats,
  Achievement,
  Activity,
  EditProfileData,
} from '../types/profile';

// Mock data for development - will be replaced with actual API calls
const mockProfile: UserProfile = {
  id: '1',
  username: 'john.doe',
  stellarAddress: 'GABC123...',
  avatar: 'https://avatars.githubusercontent.com/u/123456',
  bio: 'Blockchain developer and open-source enthusiast. Love building on Stellar!',
  level: 12,
  xp: 2450,
  totalEarnings: 1250.5,
  questsCompleted: 28,
  currentStreak: 7,
  joinDate: '2025-06-15',
  lastActive: '2026-02-18T14:30:00Z',
  isFollowing: false,
  followersCount: 142,
  followingCount: 56,
  isOwnProfile: false,
};

const mockStats: ProfileStats = {
  xp: 2450,
  level: 12,
  totalEarnings: 1250.5,
  questsCompleted: 28,
  currentStreak: 7,
  followersCount: 142,
  followingCount: 56,
  joinDate: '2025-06-15',
};

const mockAchievements: Achievement[] = [
  {
    id: '1',
    name: 'First Quest',
    description: 'Complete your first quest',
    icon: '🎯',
    earnedAt: '2025-06-16T10:00:00Z',
    rarity: 'common',
  },
  {
    id: '2',
    name: 'Streak Master',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    earnedAt: '2026-01-10T15:30:00Z',
    rarity: 'rare',
  },
  {
    id: '3',
    name: 'Quest Hunter',
    description: 'Complete 25 quests',
    icon: '🏆',
    earnedAt: '2026-02-01T09:15:00Z',
    rarity: 'epic',
  },
  {
    id: '4',
    name: 'Blockchain Pioneer',
    description: 'Be among the first 100 users',
    icon: '🚀',
    earnedAt: '2025-06-20T12:00:00Z',
    rarity: 'legendary',
  },
];

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'quest_completed',
    title: 'Completed Smart Contract Audit',
    description: 'Successfully audited and reviewed smart contract code',
    timestamp: '2026-02-18T14:30:00Z',
    relatedId: 'quest-123',
  },
  {
    id: '2',
    type: 'submission_approved',
    title: 'Submission Approved',
    description: 'Your submission for "Documentation Update" was approved',
    timestamp: '2026-02-17T11:20:00Z',
    relatedId: 'submission-456',
  },
  {
    id: '3',
    type: 'level_up',
    title: 'Level Up!',
    description: 'You reached Level 12',
    timestamp: '2026-02-15T09:45:00Z',
  },
  {
    id: '4',
    type: 'badge_earned',
    title: 'Achievement Unlocked',
    description: 'Earned "Streak Master" badge',
    timestamp: '2026-02-10T16:30:00Z',
  },
  {
    id: '5',
    type: 'quest_created',
    title: 'Created New Quest',
    description: 'Posted "Frontend Component Library" quest',
    timestamp: '2026-02-08T13:15:00Z',
    relatedId: 'quest-789',
  },
];

// Utility function for delay simulation
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches the profile data for a given Stellar address.
 * Currently returns mock data and simulates network latency.
 */
export async function fetchUserProfile(address: string): Promise<ProfileData> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/profiles/${address}`);
  // return response.json();

  // Simulate API delay
  await delay(800);

  // For demo purposes, we'll make the profile "own" if it matches a specific address
  const isOwnProfile = address === 'GABC123...';

  return {
    profile: {
      ...mockProfile,
      stellarAddress: address,
      isOwnProfile,
      isFollowing: !isOwnProfile, // Own profile can't follow itself
    },
    stats: mockStats,
    achievements: mockAchievements,
    activities: mockActivities,
  };
}

/**
 * Updates a user's profile metadata.
 * This is a placeholder implementation that simulates a successful API update.
 */
export async function updateProfile(
  address: string,
  data: EditProfileData
): Promise<UserProfile> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/profiles/${address}`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // });
  // return response.json();

  await delay(500);

  return {
    ...mockProfile,
    username: data.username,
    bio: data.bio,
    avatar: data.avatar || mockProfile.avatar,
    stellarAddress: address,
  };
}

/**
 * Sends a follow request for the specified user address.
 * This mock implementation resolves after a short delay.
 */
export async function followUser(address: string): Promise<void> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/profiles/${address}/follow`, {
  //   method: 'POST',
  // });
  // if (!response.ok) throw new Error('Failed to follow user');

  await delay(300);
  // Simulate following
  return Promise.resolve();
}

/**
 * Sends an unfollow request for the specified user address.
 * This mock implementation resolves after a short delay.
 */
export async function unfollowUser(address: string): Promise<void> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/profiles/${address}/unfollow`, {
  //   method: 'POST',
  // });
  // if (!response.ok) throw new Error('Failed to unfollow user');

  await delay(300);
  // Simulate unfollowing
  return Promise.resolve();
}

/**
 * Retrieves the user's achievements for the profile page.
 * Currently returns static mock achievements.
 */
export async function fetchUserAchievements(
  address: string
): Promise<Achievement[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/profiles/${address}/achievements`);
  // return response.json();

  await delay(400);
  return mockAchievements;
}

/**
 * Retrieves recent activity for the user's profile feed.
 * This mock implementation simulates fetching activity records.
 */
export async function fetchUserActivities(
  address: string
): Promise<Activity[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/profiles/${address}/activities`);
  // return response.json();

  await delay(600);
  return mockActivities;
}
