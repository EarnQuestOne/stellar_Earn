'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Quest, QuestStatus } from '@/lib/types/admin';

export type SortField =
  | 'title'
  | 'status'
  | 'reward'
  | 'deadline'
  | 'participants';
export type SortOrder = 'asc' | 'desc';

/** Default debounce delay for the search query, in milliseconds. */
export const DEFAULT_DEBOUNCE_MS = 300;

export function useQuestFilters(
  quests: Quest[],
  options?: { debounceMs?: number }
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search query so rapid keystrokes don't re-run the filter on
  // every change. The input stays responsive (`searchQuery` updates
  // immediately) while filtering only happens once the user pauses typing.
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, debounceMs]);

  const handleSort = (field: SortField) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return currentField;
      }
      setSortOrder('asc');
      return field;
    });
  };

  const filteredAndSortedQuests = useMemo(() => {
    let result = [...quests];

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query) ||
          q.category.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((q) => q.status === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'reward':
          comparison = a.reward - b.reward;
          break;
        case 'deadline': {
          const timeA = a.deadline ? new Date(a.deadline).getTime() : 0;
          const timeB = b.deadline ? new Date(b.deadline).getTime() : 0;
          comparison = (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
          break;
        }
        case 'participants':
          comparison = a.currentParticipants - b.currentParticipants;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [quests, debouncedSearchQuery, statusFilter, sortField, sortOrder]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortOrder,
    handleSort,
    filteredAndSortedQuests,
  };
}
