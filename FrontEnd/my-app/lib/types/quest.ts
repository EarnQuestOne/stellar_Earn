/**
 * UI Domain Models for Quests
 * These are decoupled from API DTOs and represent the shape used in the UI layer.
 * Use mappers in lib/api/mappers.ts to convert between API DTOs and these models.
 */

// UI-specific Quest status enum (runtime object + type)
export const QuestStatus = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
} as const;
export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus];

// UI-specific Quest difficulty enum (runtime object + type)
export const QuestDifficulty = {
  EASY: 'beginner',
  MEDIUM: 'intermediate',
  HARD: 'advanced',
} as const;
export type QuestDifficulty =
  (typeof QuestDifficulty)[keyof typeof QuestDifficulty];

/**
 * UI Quest domain model - decoupled from API DTOs
 * This represents the quest shape used throughout the UI components.
 */
export interface Quest {
  id: string;
  contractQuestId: string;
  title: string;
  description: string;
  category: string;
  difficulty?: QuestDifficulty;
  rewardAsset: string;
  rewardAmount: string | number;
  xpReward?: number;
  verifierAddress: string;
  deadline?: string | null;
  status: QuestStatus;
  totalClaims: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  maxParticipants?: number;
  currentParticipants?: number;
  requirements: string[];
  tags: string[];
  creator?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

// Pagination types for UI layer
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Legacy aliases for backward compatibility
export type QuestFilters = PaginationParams;
export type PaginatedQuestResponse = PaginatedResponse<Quest>;
