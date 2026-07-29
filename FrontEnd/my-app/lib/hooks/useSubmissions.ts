'use client';

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSubmissions } from '@/lib/api/submissions';
import { submissionKeys } from '@/lib/query/keys';
import type {
  SubmissionFilters,
  PaginationParams,
} from '@/lib/types/submission';

// Submissions are user-specific; re-validate sooner than quests.
const SUBMISSIONS_STALE_TIME = 30 * 1000;

export function useSubmissions(
  filters?: SubmissionFilters,
  initialPagination?: PaginationParams
) {
  const queryClient = useQueryClient();

  const stableFilters = useMemo(() => filters, [filters?.status]);
  const stablePagination = useMemo(
    () => initialPagination,
    [
      initialPagination?.page,
      initialPagination?.limit,
      initialPagination?.cursor,
    ]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: submissionKeys.list(stableFilters, stablePagination),
    queryFn: () => fetchSubmissions(stableFilters as any, stablePagination),
    staleTime: SUBMISSIONS_STALE_TIME,
  });

  const submissions = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  };

  // Optimistic update: mutates the cached list in place without a round-trip.
  const optimisticallyUpdateSubmission = useCallback(
    (id: string, updates: Record<string, unknown>) => {
      queryClient.setQueryData(
        submissionKeys.list(stableFilters, stablePagination),
        (old: typeof data) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((s: any) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          };
        }
      );
    },
    [queryClient, stableFilters, stablePagination]
  );

  return {
    submissions,
    isLoading,
    error: error as Error | null,
    refetch,
    hasMore: pagination.hasMore,
    currentPage: pagination.page,
    totalPages: pagination.totalPages,
    optimisticallyUpdateSubmission,
    // goToPage / loadMore are kept for API compat with existing callers.
    // True pagination requires updating the `initialPagination` prop externally.
    goToPage: (_page: number) => refetch(),
    loadMore: () => refetch(),
  };
}
