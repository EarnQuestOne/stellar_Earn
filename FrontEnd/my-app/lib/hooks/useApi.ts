'use client';

/**
 * Generic React hooks for interacting with the API layer.
 *
 *  useApi<T>       – fire-and-forget data fetching (auto on mount)
 *  useMutation<A, R> – imperative mutation (POST / PATCH / DELETE)
 *  usePaginatedApi<T> – paginated list fetching with load-more support
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createCancelToken } from '@/lib/api/client';
import type { CancelToken } from '@/lib/api/client';
import type { PaginationParams } from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// useApi – read-only data fetching
// ---------------------------------------------------------------------------

export interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch data from an async function on mount (and when `deps` change).
 * Automatically cancels the previous request when deps change.
 *
 * @example
 * const { data, isLoading } = useApi(
 *   (signal) => getQuestById(id, { signal }),
 *   [id],
 * );
 */
export function useApi<T>(
  fetcher: (cancelToken: CancelToken) => Promise<T>,
  deps: unknown[] = [],
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ct = createCancelToken();

    setIsLoading(true);
    setError(null);

    fetcher(ct)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      ct.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, trigger]);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  return { data, isLoading, error, refetch };
}

// ---------------------------------------------------------------------------
// useMutation – imperative mutations (POST / PATCH / DELETE)
// ---------------------------------------------------------------------------

export type MutationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseMutationState<TResult> {
  data: TResult | null;
  status: MutationStatus;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface UseMutationReturn<TArgs extends unknown[], TResult>
  extends UseMutationState<TResult> {
  mutate: (...args: TArgs) => Promise<TResult | null>;
}

/**
 * Imperative mutation hook. Call `mutate(...args)` from an event handler.
 *
 * @example
 * const { mutate, isLoading } = useMutation(claimPayout);
 * await mutate(submissionId, stellarAddress);
 */
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: {
    onSuccess?: (data: TResult) => void;
    onError?: (err: Error) => void;
  },
): UseMutationReturn<TArgs, TResult> {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setStatus('loading');
      setError(null);

      try {
        const result = await fn(...args);
        setData(result);
        setStatus('success');
        options?.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const appErr = err instanceof Error ? err : new Error(String(err));
        setError(appErr);
        setStatus('error');
        options?.onError?.(appErr);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return {
    mutate,
    status,
    isLoading: status === 'loading',
    data,
    error,
    reset,
  };
}

// ---------------------------------------------------------------------------
// usePaginatedApi – paginated list with load-more support
// ---------------------------------------------------------------------------

export interface UsePaginatedApiState<T> {
  items: T[];
  isLoading: boolean;
  isFetchingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  total: number;
  loadMore: () => void;
  refetch: () => void;
}

interface PaginatedResult<T> {
  data?: T[];
  items?: T[];
  pagination?: {
    hasMore?: boolean;
    total?: number;
    page?: number;
  };
  // Alternative flat shapes returned by some endpoints
  total?: number;
  hasMore?: boolean;
}

/**
 * Paginated list hook with automatic load-more.
 *
 * The `fetcher` receives the current page + limit and should return
 * a shape with `{ data: T[], pagination: { hasMore, total } }`.
 *
 * @example
 * const { items, loadMore, hasMore } = usePaginatedApi(
 *   (p) => getQuests({ page: p.page, limit: p.limit }),
 *   { limit: 12 },
 * );
 */
export function usePaginatedApi<T>(
  fetcher: (pagination: Required<Pick<PaginationParams, 'page' | 'limit'>>) => Promise<PaginatedResult<T>>,
  options: { limit?: number; enabled?: boolean } = {},
): UsePaginatedApiState<T> {
  const { limit = 20, enabled = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0); // used by refetch

  const cancelRef = useRef<CancelToken | null>(null);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (cancelRef.current) cancelRef.current.cancel();
      const ct = createCancelToken();
      cancelRef.current = ct;

      if (append) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetcher({ page: targetPage, limit });

        if (ct.signal.aborted) return;

        const newItems = (result.data ?? result.items ?? []) as T[];
        const pagination = result.pagination ?? {};
        const newHasMore = pagination.hasMore ?? result.hasMore ?? false;
        const newTotal = pagination.total ?? result.total ?? 0;

        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setHasMore(newHasMore);
        setTotal(newTotal);
        setPage(targetPage);
      } catch (err: unknown) {
        if (ct.signal.aborted) return;
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!ct.signal.aborted) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, limit],
  );

  // Initial load / refetch
  useEffect(() => {
    if (!enabled) return;
    load(1, false);

    return () => {
      cancelRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, trigger]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isFetchingMore) return;
    load(page + 1, true);
  }, [hasMore, isLoading, isFetchingMore, page, load]);

  const refetch = useCallback(() => {
    setItems([]);
    setPage(1);
    setTrigger((t) => t + 1);
  }, []);

  return {
    items,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    page,
    total,
    loadMore,
    refetch,
  };
}
