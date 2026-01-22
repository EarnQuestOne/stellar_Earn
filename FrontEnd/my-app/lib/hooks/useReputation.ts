'use client';

import { useState, useEffect } from 'react';
import type { UserReputation } from '@/lib/types/reputation';

interface UseReputationReturn {
  reputation: UserReputation | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching and managing user reputation data
 */
export function useReputation(userId?: string): UseReputationReturn {
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReputation = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/reputation/${userId}`);
      // if (!response.ok) throw new Error('Failed to fetch reputation');
      // const data = await response.json();
      // setReputation(data);
      
      // For now, return null - will be populated by mock data or API
      setReputation(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reputation'));
      setReputation(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReputation();
  }, [userId]);

  return {
    reputation,
    isLoading,
    error,
    refetch: fetchReputation,
  };
}
