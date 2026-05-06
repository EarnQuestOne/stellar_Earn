import { StateCreator } from 'zustand';
import type { Quest } from '@/lib/types/quest';
import type { QuestQueryParams } from '@/lib/types/api.types';

export interface QuestPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface QuestSlice {
  // state
  quests: Quest[];
  filters: QuestQueryParams;
  pagination: QuestPagination;
  questsLoading: boolean;
  questsError: string | null;

  // actions
  setQuests: (quests: Quest[]) => void;
  setQuestFilters: (filters: Partial<QuestQueryParams>) => void;
  setQuestPagination: (pagination: Partial<QuestPagination>) => void;
  setQuestsLoading: (loading: boolean) => void;
  setQuestsError: (error: string | null) => void;
  resetQuestFilters: () => void;
}

const DEFAULT_FILTERS: QuestQueryParams = {};

const DEFAULT_PAGINATION: QuestPagination = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
  hasMore: false,
};

export const createQuestSlice: StateCreator<QuestSlice> = (set) => ({
  quests: [],
  filters: DEFAULT_FILTERS,
  pagination: DEFAULT_PAGINATION,
  questsLoading: false,
  questsError: null,

  setQuests: (quests) => set({ quests }),

  setQuestFilters: (filters) =>
    set((s) => ({
      filters: { ...s.filters, ...filters },
      pagination: { ...s.pagination, page: 1 }, // reset page on filter change
    })),

  setQuestPagination: (pagination) =>
    set((s) => ({ pagination: { ...s.pagination, ...pagination } })),

  setQuestsLoading: (questsLoading) => set({ questsLoading }),

  setQuestsError: (questsError) => set({ questsError }),

  resetQuestFilters: () =>
    set({ filters: DEFAULT_FILTERS, pagination: DEFAULT_PAGINATION }),
});
