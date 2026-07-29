'use client';

import { useQuery } from '@tanstack/react-query';
import { reputationKeys } from '@/lib/query/keys';
import type { UserReputation } from '@/lib/types/reputation';

// Reputation scores change infrequently; 5-min stale window is appropriate.
const REPUTATION_STALE_TIME = 5 * 60 * 1000;

async function fetchReputation(userId: string): Promise<UserReputation | null> {
  const res = await fetch(`/api/reputation/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch reputation');
  return res.json();
}

export function useReputation(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: reputationKeys.byUser(userId ?? ''),
    queryFn: () => fetchReputation(userId!),
    enabled: !!userId,
    staleTime: REPUTATION_STALE_TIME,
  });

  return {
    reputation: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
