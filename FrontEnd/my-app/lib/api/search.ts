/**
 * Search API – global text search via the centralised Axios client.
 *
 * Endpoint: GET /api/v1/search
 */

import { get, withRetry, createCancelToken, type CancelToken } from './client';
import type { SearchResponse, SearchParams } from '@/lib/types/api.types';

// Re-export types consumed by useSearch hook (backward compat)
export type { SearchResultItem as SearchResult } from '@/lib/types/api.types';
export type SearchFilters = Pick<SearchParams, 'type' | 'limit'>;

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------

/**
 * Perform a global search across quests, users, and submissions.
 * Results are de-bounced at the hook level; this function is a thin API call.
 */
export async function searchGlobal(
  query: string,
  filters?: SearchFilters,
  cancelToken?: CancelToken,
): Promise<SearchResponse> {
  const params: Record<string, string | number | undefined> = { q: query };
  if (filters?.type && filters.type !== 'all') params.type = filters.type;
  if (filters?.limit) params.limit = filters.limit;

  return withRetry(() =>
    get<SearchResponse>('/search', {
      params,
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Recent searches (local storage)
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT = 5;

export async function getRecentSearches(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current: string[] = JSON.parse(
      localStorage.getItem(RECENT_SEARCHES_KEY) || '[]',
    );
    const filtered = current.filter((q) => q !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}
