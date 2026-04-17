'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { getQuests } from '@/lib/api/quests';
import type { QuestQueryParams } from '@/lib/types/api.types';

export function useQuests(
  filters?: QuestQueryParams,
) {
  const quests           = useStore((s) => s.quests);
  const questsLoading    = useStore((s) => s.questsLoading);
  const questsError      = useStore((s) => s.questsError);
  const paginationData   = useStore((s) => s.pagination);
  const setQuests        = useStore((s) => s.setQuests);
  const setQuestsLoading = useStore((s) => s.setQuestsLoading);
  const setQuestsError   = useStore((s) => s.setQuestsError);
  const setPagination    = useStore((s) => s.setQuestPagination);

  const fetchQuests = useCallback(async () => {
    try {
      setQuestsLoading(true);
      setQuestsError(null);

      const response = await getQuests(filters);
      setQuests(response.quests);
      setPagination({
        page:       response.page       ?? 1,
        limit:      response.limit      ?? 12,
        total:      response.total      ?? 0,
        totalPages: response.totalPages ?? 0,
        hasMore:    response.page < (response.totalPages ?? 1),
      });
    } catch (err) {
      setQuestsError(err instanceof Error ? err.message : 'Failed to fetch quests');
      setQuests([]);
    } finally {
      setQuestsLoading(false);
    }
  }, [JSON.stringify(filters)]);

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