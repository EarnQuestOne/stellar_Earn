'use client';

import { useEffect, useCallback, useMemo } from 'react';
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

  const memoizedFilters = useMemo(() => filters, [filters?.status]);
  const memoizedInitialPagination = useMemo(() => initialPagination, [
    initialPagination?.page,
    initialPagination?.limit,
    initialPagination?.cursor,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchSubmissions(memoizedFilters as any, {
        page:   pagination.page,
        limit:  pagination.limit,
        ...memoizedInitialPagination,
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
  }, [
    memoizedFilters,
    pagination.page,
    pagination.limit,
    memoizedInitialPagination,
    setLoading,
    setError,
    setSubmissions,
    setPagination,
    fetchSubmissions
  ]);

  useEffect(() => {
    if (memoizedFilters) setFilters(memoizedFilters);
  }, [memoizedFilters, setFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = useCallback((page: number) => {
    setPagination({ page });
  }, [setPagination]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore) setPagination({ page: pagination.page + 1 });
  }, [pagination.hasMore, pagination.page, setPagination]);

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