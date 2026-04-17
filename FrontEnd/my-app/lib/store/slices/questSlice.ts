import { StateCreator } from "zustand";
import type { QuestFilters } from "@/lib/types/quest";
import type { QuestResponse } from "@/lib/types/api.types";

export interface QuestSlice {
  // state
  quests: QuestResponse[];
  filters: QuestFilters;
  pagination: QuestPagination;
  questsLoading: boolean;
  questsError: string | null;

  // actions
  setQuests: (quests: QuestResponse[]) => void;
  setQuestFilters: (filters: Partial<QuestFilters>) => void;
  setQuestPagination: (pagination: Partial<QuestPagination>) => void;
  setQuestsLoading: (loading: boolean) => void;
  setQuestsError: (error: string | null) => void;
  resetQuestFilters: () => void;
}

const DEFAULT_FILTERS: QuestFilters = {};

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