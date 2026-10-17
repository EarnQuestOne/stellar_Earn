/**
 * Centralized query key factory.
 *
 * Every key is an array so React Query can do prefix-based invalidation:
 *   queryClient.invalidateQueries({ queryKey: questKeys.all })
 * will invalidate both list and detail queries for quests.
 */

import type { QuestQueryParams, PaginationParams } from '@/lib/types/api.types';
import type { SubmissionFilters } from '@/lib/api/submissions';

export const questKeys = {
  all: ['quests'] as const,
  lists: () => [...questKeys.all, 'list'] as const,
  list: (filters?: QuestQueryParams, pagination?: PaginationParams) =>
    [...questKeys.lists(), { filters, pagination }] as const,
  details: () => [...questKeys.all, 'detail'] as const,
  detail: (id: string) => [...questKeys.details(), id] as const,
};

export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (filters?: SubmissionFilters, pagination?: PaginationParams) =>
    [...submissionKeys.lists(), { filters, pagination }] as const,
  detail: (id: string) => [...submissionKeys.all, 'detail', id] as const,
};

export const reputationKeys = {
  all: ['reputation'] as const,
  byUser: (userId: string) => [...reputationKeys.all, userId] as const,
};

export const userStatsKeys = {
  all: ['userStats'] as const,
  byAddress: (address: string) => [...userStatsKeys.all, address] as const,
};

export const profileKeys = {
  all: ['profile'] as const,
  byAddress: (address: string) => [...profileKeys.all, address] as const,
};
