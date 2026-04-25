import type {
  QuestResponse,
  SubmissionResponse,
  UserStatsResponse,
} from "./api.types";

export type UserStats = UserStatsResponse;
export type Quest = QuestResponse;
export type Submission = SubmissionResponse;

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
