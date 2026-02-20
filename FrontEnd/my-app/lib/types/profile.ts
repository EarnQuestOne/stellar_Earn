// Profile type definitions

export interface UserProfile {
  id: string;
  username: string;
  stellarAddress: string;
  avatar?: string;
  bio?: string;
  level: number;
  xp: number;
  totalEarnings: number;
  questsCompleted: number;
  currentStreak: number;
  joinDate: string;
  lastActive: string;
  isFollowing?: boolean;
  followersCount: number;
  followingCount: number;
  isOwnProfile: boolean;
}

export interface ProfileStats {
  xp: number;
  level: number;
  totalEarnings: number;
  questsCompleted: number;
  currentStreak: number;
  followersCount: number;
  followingCount: number;
  joinDate: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Activity {
  id: string;
  type: 'quest_completed' | 'quest_created' | 'submission_approved' | 'level_up' | 'badge_earned';
  title: string;
  description: string;
  timestamp: string;
  relatedId?: string;
}

export interface EditProfileData {
  username: string;
  bio: string;
  avatar?: string;
}

export interface ProfileData {
  profile: UserProfile;
  stats: ProfileStats;
  achievements: Achievement[];
  activities: Activity[];
}