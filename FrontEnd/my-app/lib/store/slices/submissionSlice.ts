import { StateCreator } from 'zustand';
import type { Submission, SubmissionFilters } from '@/lib/types/submission';

export type SubmissionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SubmissionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SubmissionSlice {
  // state
  submissions: Submission[];
  drafts: Submission[];
  submissionStatus: SubmissionStatus;
  submissionsLoading: boolean;
  submissionsError: string | null;
  submissionFilters: SubmissionFilters;
  submissionPagination: SubmissionPagination;

  // actions
  setSubmissions: (submissions: Submission[]) => void;
  setDrafts: (drafts: Submission[]) => void;
  setSubmissionStatus: (status: SubmissionStatus) => void;
  setSubmissionsLoading: (loading: boolean) => void;
  setSubmissionsError: (error: string | null) => void;
  setSubmissionFilters: (filters: Partial<SubmissionFilters>) => void;
  setSubmissionPagination: (pagination: Partial<SubmissionPagination>) => void;

  // optimistic update
  optimisticallyUpdateSubmission: (
    id: string,
    patch: Partial<Submission>
  ) => void;
}

const DEFAULT_PAGINATION: SubmissionPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasMore: false,
};

export const createSubmissionSlice: StateCreator<SubmissionSlice> = (set) => ({
  submissions: [],
  drafts: [],
  submissionStatus: 'idle',
  submissionsLoading: false,
  submissionsError: null,
  submissionFilters: {},
  submissionPagination: DEFAULT_PAGINATION,

  setSubmissions: (submissions) => set({ submissions }),
  setDrafts: (drafts) => set({ drafts }),
  setSubmissionStatus: (submissionStatus) => set({ submissionStatus }),
  setSubmissionsLoading: (submissionsLoading) => set({ submissionsLoading }),
  setSubmissionsError: (submissionsError) => set({ submissionsError }),

  setSubmissionFilters: (filters) =>
    set((s) => ({
      submissionFilters: { ...s.submissionFilters, ...filters },
      submissionPagination: { ...s.submissionPagination, page: 1 },
    })),

  setSubmissionPagination: (pagination) =>
    set((s) => ({
      submissionPagination: { ...s.submissionPagination, ...pagination },
    })),

  optimisticallyUpdateSubmission: (id, patch) =>
    set((s) => ({
      submissions: s.submissions.map((sub) =>
        sub.id === id ? { ...sub, ...patch } : sub
      ),
    })),
});
