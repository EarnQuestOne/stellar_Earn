export type QuestStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type QuestCategory = 'Development' | 'Blockchain' | 'Documentation' | 'Design' | 'Testing' | 'Community';

export interface Quest {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  status: QuestStatus;
  reward: number;
  xpReward: number;
  deadline: string;
  maxParticipants: number;
  currentParticipants: number;
  requirements: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface QuestFormData {
  title: string;
  description: string;
  shortDescription: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  reward: number;
  xpReward: number;
  deadline: string;
  maxParticipants: number;
  requirements: string[];
  tags: string[];
}

export interface AdminStats {
  totalQuests: number;
  activeQuests: number;
  completedQuests: number;
  totalParticipants: number;
  totalRewardsDistributed: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}

export interface AdminUser {
  id: string;
  stellarAddress: string;
  username: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
}

export interface BulkOperation {
  action: 'activate' | 'pause' | 'complete' | 'cancel' | 'delete';
  questIds: string[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
