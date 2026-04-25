'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getQuests } from '@/lib/api/quests';
import type { QuestQueryParams, PaginationParams } from '@/lib/types/api.types';

export function useQuests(
  filters?: QuestQueryParams,
  pagination?: PaginationParams,
) {
  const quests           = useStore((s) => s.quests);
  const questsLoading    = useStore((s) => s.questsLoading);
  const questsError      = useStore((s) => s.questsError);
  const paginationData   = useStore((s) => s.pagination);
  const setQuests        = useStore((s) => s.setQuests);
  const setQuestsLoading = useStore((s) => s.setQuestsLoading);
  const setQuestsError   = useStore((s) => s.setQuestsError);
  const setPagination    = useStore((s) => s.setQuestPagination);

  // Memoize filters to avoid unnecessary re-renders when the object reference changes
  // but the values remain the same.
  const memoizedFilters = useMemo(() => filters, [
    filters?.status,
    filters?.category,
    filters?.difficulty,
    filters?.search,
    filters?.minReward,
    filters?.maxReward,
    filters?.sortBy,
    filters?.order,
  ]);

  const memoizedPagination = useMemo(() => pagination, [
    pagination?.page,
    pagination?.limit,
    pagination?.cursor,
  ]);

  const fetchQuests = useCallback(async () => {
    try {
      setQuestsLoading(true);
      setQuestsError(null);

      const response = await getQuests({ ...memoizedFilters, ...memoizedPagination });
      setQuests(response.quests as any);
      setPagination({
        page: response.page ?? 1,
        limit: response.limit ?? 12,
        total: response.total ?? 0,
        totalPages: response.totalPages ?? 0,
        hasMore: (response.page ?? 0) < (response.totalPages ?? 0),
      });
    } catch (err) {
      setQuestsError(err instanceof Error ? err.message : 'Failed to fetch quests');
      setQuests([]);
    } finally {
      setQuestsLoading(false);
    }
  }, [
    memoizedFilters,
    memoizedPagination,
    setQuestsLoading,
    setQuestsError,
    setQuests,
    setPagination,
    getQuests
  ]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  return {
    quests,
    isLoading:  questsLoading,
    error:      questsError ? new Error(questsError) : null,
    pagination: paginationData,
    refetch:    fetchQuests,
  };
}