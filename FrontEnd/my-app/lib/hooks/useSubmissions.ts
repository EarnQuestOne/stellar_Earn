'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { fetchSubmissions } from '@/lib/api/submissions';
import type { SubmissionFilters, PaginationParams } from '@/lib/types/submission';

export function useSubmissions(
  filters?: SubmissionFilters,
  initialPagination?: PaginationParams,
) {
  const submissions        = useStore((s) => s.submissions);
  const isLoading          = useStore((s) => s.submissionsLoading);
  const error              = useStore((s) => s.submissionsError);
  const pagination         = useStore((s) => s.submissionPagination);

  const setSubmissions     = useStore((s) => s.setSubmissions);
  const setLoading         = useStore((s) => s.setSubmissionsLoading);
  const setError           = useStore((s) => s.setSubmissionsError);
  const setPagination      = useStore((s) => s.setSubmissionPagination);
  const setFilters         = useStore((s) => s.setSubmissionFilters);
  const optimisticUpdate   = useStore((s) => s.optimisticallyUpdateSubmission);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchSubmissions(filters as any, {
        page:   pagination.page,
        limit:  pagination.limit,
        ...initialPagination,
      });

      setSubmissions(response.data as any);
      setPagination({
        total:      response.pagination.total      ?? 0,
        totalPages: response.pagination.totalPages ?? 0,
        hasMore:    response.pagination.hasMore    ?? false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, pagination.page, pagination.limit]);

  useEffect(() => {
    if (filters) setFilters(filters);
  }, [filters?.status]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = useCallback((page: number) => {
    setPagination({ page });
  }, []);

  const loadMore = useCallback(() => {
    if (pagination.hasMore) setPagination({ page: pagination.page + 1 });
  }, [pagination.hasMore, pagination.page]);

  return {
    submissions,
    isLoading,
    error:       error ? new Error(error) : null,
    refetch:     load,
    hasMore:     pagination.hasMore,
    currentPage: pagination.page,
    totalPages:  pagination.totalPages,
    goToPage,
    loadMore,
    optimisticallyUpdateSubmission: optimisticUpdate,
  };
}