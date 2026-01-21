// Dashboard type definitions

export interface UserStats {
  xp: number;
  level: number;
  totalEarnings: number;
  questsCompleted: number;
  currentStreak: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  deadline: string;
  progress: number;
  status: 'active' | 'completed' | 'expired';
  category: string;
}

export interface Submission {
  id: string;
  questId: string;
  questTitle: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reward: number;
  feedback?: string;
}

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
