'use client';

import { useState, useMemo } from 'react';
import type { Quest, QuestStatus } from '@/lib/types/admin';

export type SortField = 'title' | 'status' | 'reward' | 'deadline' | 'participants';
export type SortOrder = 'asc' | 'desc';

export function useQuestFilters(quests: Quest[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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
  }, [quests, searchQuery, statusFilter, sortField, sortOrder]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortOrder,
    handleSort,
    filteredAndSortedQuests,
  };
}
