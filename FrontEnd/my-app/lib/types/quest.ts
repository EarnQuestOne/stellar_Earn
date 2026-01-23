export enum QuestStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum QuestDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: string; // Security, Frontend, Backend, Docs, Testing, Community
  difficulty: QuestDifficulty;
  rewardAmount: number;
  rewardAsset: string;
  xpReward: number;
  status: QuestStatus;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestFilters {
  status?: QuestStatus;
  difficulty?: QuestDifficulty;
  category?: string;
  minReward?: number;
  maxReward?: number;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
    cursor?: string;
    nextCursor?: string;
  };
}
