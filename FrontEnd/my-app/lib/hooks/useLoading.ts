'use client';

import { useCallback, useState } from 'react';

interface UseLoadingOptions {
  initialLoading?: boolean;
  initialProgress?: number;
}

export function useLoading(options: UseLoadingOptions = {}) {
  const { initialLoading = false, initialProgress = 0 } = options;
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [progress, setProgress] = useState(initialProgress);

  const start = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stop = useCallback(() => {
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setProgress(0);
  }, []);

  const withLoading = useCallback(async <T>(task: () => Promise<T>) => {
    setIsLoading(true);
    try {
      return await task();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    progress,
    setIsLoading,
    setProgress,
    start,
    stop,
    reset,
    withLoading,
  };
}
