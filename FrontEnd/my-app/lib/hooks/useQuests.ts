'use client';

import { useState, useEffect } from 'react';
import { getQuests } from '@/lib/api/quests';
import type { Quest, QuestFilters, PaginationParams, PaginatedResponse } from '@/lib/types/quest';

interface UseQuestsReturn {
  quests: Quest[];
  isLoading: boolean;
  error: Error | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  refetch: () => void;
}

/**
 * Custom hook for fetching quests with filters and pagination
 */
export function useQuests(
  filters?: QuestFilters,
  pagination?: PaginationParams,
): UseQuestsReturn {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [paginationData, setPaginationData] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const fetchQuests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response: PaginatedResponse<Quest> = await getQuests(filters, pagination);
      setQuests(response.data);
      setPaginationData({
        page: response.pagination.page || 1,
        limit: response.pagination.limit || 12,
        total: response.pagination.total || 0,
        totalPages: response.pagination.totalPages || 0,
        hasMore: response.pagination.hasMore || false,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch quests'));
      setQuests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, [JSON.stringify(filters), JSON.stringify(pagination)]);

  return {
    quests,
    isLoading,
    error,
    pagination: paginationData,
    refetch: fetchQuests,
  };
}
