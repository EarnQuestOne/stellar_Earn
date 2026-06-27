import type { UserStatsResponse } from './api.types';
import type { Quest } from './quest';
import type { Submission } from './submission';

export type { Quest, Submission };
export type UserStats = UserStatsResponse;

export interface EarningsData {
  date: string;
  amount: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface DashboardData {
  stats: UserStats;
  activeQuests: Quest[];
  recentSubmissions: Submission[];
  earningsHistory: EarningsData[];
  badges: Badge[];
}
