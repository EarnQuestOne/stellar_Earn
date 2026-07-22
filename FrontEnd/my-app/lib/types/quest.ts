import type {
  QuestResponse,
  QuestQueryParams,
  PaginationParams,
  PaginatedQuestsResponse,
} from './api.types';

export const QuestStatus = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
} as const;
export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus];

export const QuestDifficulty = {
  EASY: 'beginner',
  MEDIUM: 'intermediate',
  HARD: 'advanced',
} as const;
export type QuestDifficulty =
  (typeof QuestDifficulty)[keyof typeof QuestDifficulty];

export interface Quest extends Omit<QuestResponse, 'status' | 'difficulty'> {
  status: QuestStatus;
  difficulty?: QuestDifficulty;
}

// Legacy aliases kept for existing imports.
export type QuestFilters = QuestQueryParams;
export type { PaginationParams };
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
export type PaginatedQuestResponse = PaginatedQuestsResponse;
