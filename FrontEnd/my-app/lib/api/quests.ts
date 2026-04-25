/**
 * Quests API – full CRUD via the centralised Axios client.
 *
 * Endpoints (all under /api/v1/quests):
 *  GET    /           – list quests (with filters + pagination)
 *  GET    /:id        – single quest
 *  POST   /           – create quest (Admin)
 *  PATCH  /:id        – update quest (Admin)
 *  DELETE /:id        – delete quest (Admin)
 */

import {
  get,
  post,
  patch,
  del,
  withRetry,
  createCancelToken,
  type CancelToken,
} from './client';
import { cacheManager } from '@/lib/utils/cache';
import type {
  QuestResponse,
  PaginatedQuestsResponse,
  CreateQuestRequest,
  UpdateQuestRequest,
  QuestQueryParams,
} from '@/lib/types/api.types';

// Re-export legacy types for backward compatibility with existing hooks
export type { QuestFilters, PaginationParams, PaginatedResponse } from '@/lib/types/quest';

// ---------------------------------------------------------------------------
// List quests
// ---------------------------------------------------------------------------

/**
 * Fetch quests with optional filters and pagination.
 * Retries up to 3 times on transient failures.
 */
export async function getQuests(
  filters?: QuestQueryParams,
  cancelToken?: CancelToken,
): Promise<PaginatedQuestsResponse> {
  const params = buildQuestParams(filters);

  return withRetry(() =>
    get<PaginatedQuestsResponse>('/quests', {
      params,
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Single quest
// ---------------------------------------------------------------------------

/**
 * Fetch a single quest by ID.
 * Results are cached for 60 s to avoid redundant network calls.
 */
export async function getQuestById(
  id: string,
  cancelToken?: CancelToken,
): Promise<QuestResponse> {
  return cacheManager.get(
    `quest-${id}`,
    () =>
      withRetry(() =>
        get<QuestResponse>(`/quests/${id}`, {
          signal: cancelToken?.signal,
        }),
      ),
    60_000,
  );
}

// ---------------------------------------------------------------------------
// Create quest (Admin)
// ---------------------------------------------------------------------------

export async function createQuest(
  payload: CreateQuestRequest,
): Promise<QuestResponse> {
  const result = await post<QuestResponse>('/quests', payload);
  // Invalidate list cache (no simple key, so just clear all quest entries)
  cacheManager.clear();
  return result;
}

// ---------------------------------------------------------------------------
// Update quest (Admin)
// ---------------------------------------------------------------------------

export async function updateQuest(
  id: string,
  payload: UpdateQuestRequest,
): Promise<QuestResponse> {
  const result = await patch<QuestResponse>(`/quests/${id}`, payload);
  cacheManager.invalidate(`quest-${id}`);
  return result;
}

// ---------------------------------------------------------------------------
// Delete quest (Admin)
// ---------------------------------------------------------------------------

export async function deleteQuest(id: string): Promise<void> {
  await del(`/quests/${id}`);
  cacheManager.invalidate(`quest-${id}`);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function buildQuestParams(
  filters?: QuestQueryParams,
): Record<string, string | number | undefined> {
  if (!filters) return {};
  return {
    status: filters.status,
    category: filters.category,
    difficulty: filters.difficulty,
    search: filters.search,
    minReward: filters.minReward,
    maxReward: filters.maxReward,
    sortBy: filters.sortBy,
    order: filters.order,
    page: filters.page,
    limit: filters.limit,
    cursor: filters.cursor,
  };
}
