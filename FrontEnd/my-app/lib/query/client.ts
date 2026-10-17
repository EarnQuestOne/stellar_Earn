'use client';

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 60 s; no background refetch during that window.
      staleTime: 60 * 1000,
      // Keep inactive query data in cache for 5 min before garbage collection.
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
