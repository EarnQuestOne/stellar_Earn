'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export type QuestFilterParams = {
  status?: string;
  category?: string;
  search?: string;
};

/**
 * Fix #2221: hook that keeps QuestFilters state in sync with the URL.
 * Reads filter values from search params and writes them back on change,
 * so the browser URL always reflects the active filters (shareable + back-button safe).
 */
export function useQuestUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: QuestFilterParams = {
    status: searchParams?.get('status') ?? undefined,
    category: searchParams?.get('category') ?? undefined,
    search: searchParams?.get('search') ?? undefined,
  };

  const setFilters = useCallback(
    (updates: Partial<QuestFilterParams>) => {
      const params = new URLSearchParams(searchParams?.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val) params.set(key, val);
        else params.delete(key);
      });
      router.replace(`${pathname ?? '/'}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname ?? '/', { scroll: false });
  }, [router, pathname]);

  return { filters, setFilters, clearFilters };
}
