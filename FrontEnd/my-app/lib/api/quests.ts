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
  CreateQuestRequest,
  UpdateQuestRequest,
  QuestQueryParams,
} from '@/lib/types/api.types';
import type { Quest, PaginatedResponse } from '@/lib/types/quest';
import { mapQuest, mapPaginatedQuests } from './mappers';

const QUEST_LIST_TTL_MS = 3 * 60 * 1000;
const QUEST_LIST_STALE_TTL_MS = 10 * 60 * 1000;

type QuestListCacheOptions = {
  onRevalidate?: (data: PaginatedResponse<Quest>) => void;
};

// Re-export legacy types for backward compatibility with existing hooks
export type {
  QuestFilters,
  PaginationParams,
  PaginatedResponse,
} from '@/lib/types/quest';

// ---------------------------------------------------------------------------
// List quests
// ---------------------------------------------------------------------------

/**
 * Fetch quests with optional filters and pagination.
 * Results are cached for 3 minutes with automatic request deduplication.
 * Multiple simultaneous requests with identical parameters will share the same network call.
 * Retries up to 3 times on transient failures.
 */
export async function getQuests(
  filters?: QuestQueryParams,
  cancelToken?: CancelToken,
  timeout?: number,
  cacheOptions?: QuestListCacheOptions
): Promise<PaginatedResponse<Quest>> {
  const params = buildQuestParams(filters);
  const cacheKey = `${generateQuestsCacheKey(params)}${timeout ? `:t-${timeout}` : ''}`;

  return cacheManager.getStaleWhileRevalidate(
    cacheKey,
    async () => {
      const raw = await withRetry(() =>
        get<any>('/quests', {
          params,
          signal: cancelToken?.signal,
          timeout,
        })
      );
      return mapPaginatedQuests(raw);
    },
    {
      ttl: QUEST_LIST_TTL_MS,
      staleTtl: QUEST_LIST_STALE_TTL_MS,
      onRevalidate: cacheOptions?.onRevalidate,
    }
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
  cancelToken?: CancelToken
): Promise<Quest> {
  return cacheManager.get(
    `quest-${id}`,
    async () => {
      const raw = await withRetry(() =>
        get<any>(`/quests/${id}`, {
          signal: cancelToken?.signal,
        })
      );
      return mapQuest(raw);
    },
    60_000
  );
}

// ---------------------------------------------------------------------------
// Create quest (Admin)
// ---------------------------------------------------------------------------

export async function createQuest(
  payload: CreateQuestRequest
): Promise<Quest> {
  const result = await post<any>('/quests', payload);
  // Invalidate list cache (no simple key, so just clear all quest entries)
  cacheManager.clear();
  return mapQuest(result);
}

// ---------------------------------------------------------------------------
// Update quest (Admin)
// ---------------------------------------------------------------------------

export async function updateQuest(
  id: string,
  payload: UpdateQuestRequest
): Promise<Quest> {
  const result = await patch<any>(`/quests/${id}`, payload);
  cacheManager.invalidate(`quest-${id}`);
  return mapQuest(result);
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

/**
 * Generate a cache key from quest query parameters.
 * Serializes all filter parameters to create a unique key for caching.
 * Undefined values are excluded to avoid collision between different filter states.
 */
function generateQuestsCacheKey(
  params: Record<string, string | number | undefined>
): string {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `quests-list:${filteredParams || 'default'}`;
}

function buildQuestParams(
  filters?: QuestQueryParams
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
