'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQuests } from '@/lib/api/quests';
import { questKeys } from '@/lib/query/keys';
import type { QuestQueryParams, PaginationParams } from '@/lib/types/api.types';

// Quest list data is considered fresh for 2 min; frequently updated but not real-time.
const QUESTS_STALE_TIME = 2 * 60 * 1000;

export function useQuests(
  filters?: QuestQueryParams,
  pagination?: PaginationParams
) {
  // Stable references so the query key doesn't change on every render when the
  // caller passes an inline object literal.
  const stableFilters = useMemo(
    () => filters,
    [
      filters?.status,
      filters?.category,
      filters?.difficulty,
      filters?.search,
      filters?.minReward,
      filters?.maxReward,
      filters?.sortBy,
      filters?.order,
    ]
  );

  const stablePagination = useMemo(
    () => pagination,
    [pagination?.page, pagination?.limit, pagination?.cursor]
  );

  const {
    data,
    isLoading,
    error,
    refetch: rqRefetch,
  } = useQuery({
    queryKey: questKeys.list(stableFilters, stablePagination),
    queryFn: () => getQuests({ ...stableFilters, ...stablePagination }),
    staleTime: QUESTS_STALE_TIME,
  });

  return {
    quests: data?.quests ?? [],
    isLoading,
    error: error as Error | null,
    pagination: data
      ? {
          page: data.page ?? 1,
          limit: data.limit ?? 12,
          total: data.total ?? 0,
          totalPages: data.totalPages ?? 0,
          hasMore: (data.page ?? 0) < (data.totalPages ?? 0),
        }
      : null,
    refetch: async () => {
      await rqRefetch();
    },
  };
}
