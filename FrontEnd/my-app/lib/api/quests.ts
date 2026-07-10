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
  QuestStatus,
} from '@/lib/types/api.types';

const QUEST_LIST_TTL_MS = 3 * 60 * 1000;
const QUEST_LIST_STALE_TTL_MS = 10 * 60 * 1000;

type QuestListCacheOptions = {
  onRevalidate?: (data: PaginatedQuestsResponse) => void;
};

// Re-export legacy types for backward compatibility with existing hooks
export type {
  QuestFilters,
  PaginationParams,
  PaginatedResponse,
} from '@/lib/types/quest';

// ---------------------------------------------------------------------------
// Serialization / Deserialization helpers
// ---------------------------------------------------------------------------

function deserializeQuest(data: any): QuestResponse {
  if (!data) throw new Error('Cannot deserialize null or undefined quest data');

  // Normalize status from backend representation ('active' | 'draft' | 'completed' | 'archived')
  // to frontend representation ('Active' | 'Paused' | 'Completed' | 'Expired')
  let status: QuestStatus = 'Active';
  if (data.status) {
    const rawStatus = String(data.status).toLowerCase();
    if (rawStatus === 'active') {
      status = 'Active';
    } else if (rawStatus === 'draft' || rawStatus === 'paused') {
      status = 'Paused';
    } else if (rawStatus === 'completed') {
      status = 'Completed';
    } else if (rawStatus === 'archived' || rawStatus === 'expired') {
      status = 'Expired';
    } else {
      const capitalized =
        data.status.charAt(0).toUpperCase() +
        data.status.slice(1).toLowerCase();
      if (['Active', 'Paused', 'Completed', 'Expired'].includes(capitalized)) {
        status = capitalized as QuestStatus;
      }
    }
  }

  return {
    id: data.id,
    contractQuestId: data.contractQuestId || data.contractTaskId || '0',
    title: data.title,
    description: data.description,
    category: data.category || 'General',
    difficulty: data.difficulty || undefined,
    rewardAsset: data.rewardAsset || 'XLM',
    rewardAmount: data.rewardAmount,
    xpReward: data.xpReward != null ? Number(data.xpReward) : undefined,
    verifierAddress: data.verifierAddress || data.createdBy || '',
    deadline: data.deadline || null,
    status,
    totalClaims: data.totalClaims != null ? Number(data.totalClaims) : 0,
    totalSubmissions:
      data.totalSubmissions != null ? Number(data.totalSubmissions) : 0,
    approvedSubmissions:
      data.approvedSubmissions != null ? Number(data.approvedSubmissions) : 0,
    rejectedSubmissions:
      data.rejectedSubmissions != null ? Number(data.rejectedSubmissions) : 0,
    maxParticipants:
      data.maxParticipants != null ? Number(data.maxParticipants) : undefined,
    currentParticipants:
      data.currentParticipants != null
        ? Number(data.currentParticipants)
        : undefined,
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    creator: data.creator
      ? {
          id: data.creator.id,
          name: data.creator.name,
          avatarUrl: data.creator.avatarUrl || undefined,
        }
      : data.createdBy
        ? {
            id: data.createdBy,
            name: 'StellarEarn Creator',
          }
        : undefined,
    skills: Array.isArray(data.skills) ? data.skills : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function deserializePaginatedQuests(response: any): PaginatedQuestsResponse {
  if (!response)
    throw new Error('Cannot deserialize null or undefined paginated response');

  // Handle both backend wrapped response format and direct mock format
  const rawData = response.data;

  let questsList: any[] = [];
  let total = 0;
  let page = 1;
  let limit = 10;
  let totalPages = 1;

  if (rawData && typeof rawData === 'object') {
    if (Array.isArray(rawData.data)) {
      questsList = rawData.data;
      limit = rawData.limit ?? 10;
      total = rawData.total ?? questsList.length;
      page = rawData.page ?? 1;
      totalPages = rawData.totalPages ?? 1;
    } else if (Array.isArray(rawData.quests)) {
      questsList = rawData.quests;
      total = rawData.total ?? questsList.length;
      page = rawData.page ?? 1;
      limit = rawData.limit ?? 10;
      totalPages = rawData.totalPages ?? 1;
    } else if (Array.isArray(response.quests)) {
      questsList = response.quests;
      total = response.total ?? questsList.length;
      page = response.page ?? 1;
      limit = response.limit ?? 10;
      totalPages = response.totalPages ?? 1;
    } else if (Array.isArray(response.data)) {
      questsList = response.data;
      total = response.total ?? questsList.length;
      page = response.page ?? 1;
      limit = response.limit ?? 10;
      totalPages = response.totalPages ?? 1;
    }
  } else {
    if (Array.isArray(response.quests)) {
      questsList = response.quests;
      total = response.total ?? questsList.length;
      page = response.page ?? 1;
      limit = response.limit ?? 10;
      totalPages = response.totalPages ?? 1;
    } else if (Array.isArray(response.data)) {
      questsList = response.data;
      total = response.total ?? questsList.length;
      page = response.page ?? 1;
      limit = response.limit ?? 10;
      totalPages = response.totalPages ?? 1;
    }
  }

  return {
    quests: questsList.map(deserializeQuest),
    total,
    page,
    limit,
    totalPages,
  };
}

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
): Promise<PaginatedQuestsResponse> {
  const params = buildQuestParams(filters);
  const cacheKey = `${generateQuestsCacheKey(params)}${timeout ? `:t-${timeout}` : ''}`;

  return cacheManager.getStaleWhileRevalidate(
    cacheKey,
    async () => {
      const response = await withRetry(() =>
        get<any>('/quests', {
          params,
          signal: cancelToken?.signal,
          timeout,
        })
      );
      return deserializePaginatedQuests(response);
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
): Promise<QuestResponse> {
  return cacheManager.get(
    `quest-${id}`,
    async () => {
      const response = await withRetry(() =>
        get<any>(`/quests/${id}`, {
          signal: cancelToken?.signal,
        })
      );

      // Handle both wrapped { data: QuestResponseDto } and unwrapped QuestResponseDto
      const rawQuest =
        response &&
        response.data &&
        !Array.isArray(response.data) &&
        response.data.id
          ? response.data
          : response;

      return deserializeQuest(rawQuest);
    },
    60_000
  );
}

// ---------------------------------------------------------------------------
// Create quest (Admin)
// ---------------------------------------------------------------------------

export async function createQuest(
  payload: CreateQuestRequest
): Promise<QuestResponse> {
  const result = await post<any>('/quests', payload);
  cacheManager.clear();

  const rawQuest =
    result && result.data && !Array.isArray(result.data) && result.data.id
      ? result.data
      : result;

  return deserializeQuest(rawQuest);
}

// ---------------------------------------------------------------------------
// Update quest (Admin)
// ---------------------------------------------------------------------------

export async function updateQuest(
  id: string,
  payload: UpdateQuestRequest
): Promise<QuestResponse> {
  const result = await patch<any>(`/quests/${id}`, payload);
  cacheManager.invalidate(`quest-${id}`);

  const rawQuest =
    result && result.data && !Array.isArray(result.data) && result.data.id
      ? result.data
      : result;

  return deserializeQuest(rawQuest);
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
