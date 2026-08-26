'use client';

import { useQuery } from '@tanstack/react-query';
import { userStatsKeys } from '@/lib/query/keys';
import type {
  DashboardData,
  UserStats,
  Quest,
  Submission,
  EarningsData,
  Badge,
} from '../types/dashboard';
import {
  fetchDashboardData,
  fetchUserStats,
  fetchActiveQuests,
  fetchRecentSubmissions,
  fetchEarningsHistory,
  fetchBadges,
} from '../api/user';
import { useAuth } from '@/context/AuthContext';

// Dashboard aggregates several endpoints; 60 s stale time avoids hammering the API.
const DASHBOARD_STALE_TIME = 60 * 1000;

export function useUserStats() {
  const { user } = useAuth();
  const address = user?.stellarAddress;

  const {
    data,
    isLoading,
    error,
    refetch: rqRefetch,
  } = useQuery({
    queryKey: userStatsKeys.byAddress(address ?? ''),
    queryFn: () => fetchDashboardData(address) as Promise<DashboardData>,
    enabled: !!address,
    staleTime: DASHBOARD_STALE_TIME,
  });

  return {
    stats: (data?.stats ?? null) as UserStats | null,
    activeQuests: (data?.activeQuests ?? []) as Quest[],
    recentSubmissions: (data?.recentSubmissions ?? []) as Submission[],
    earningsHistory: (data?.earningsHistory ?? []) as EarningsData[],
    badges: (data?.badges ?? []) as Badge[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch: async () => {
      await rqRefetch();
    },
  };
}

// Individual hooks — each backed by its own React Query entry so components
// can subscribe to only the slice of data they need.

export function useStats() {
  const { user } = useAuth();
  const address = user?.stellarAddress;

  const { data, isLoading, error } = useQuery({
    queryKey: [...userStatsKeys.byAddress(address ?? ''), 'stats'],
    queryFn: () => fetchUserStats(address!),
    enabled: !!address,
    staleTime: DASHBOARD_STALE_TIME,
  });

  return {
    stats: data as UserStats | undefined,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useActiveQuests() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activeQuests'],
    queryFn: fetchActiveQuests,
    staleTime: DASHBOARD_STALE_TIME,
  });

  return {
    quests: (data ?? []) as Quest[],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useRecentSubmissions() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['recentSubmissions'],
    queryFn: fetchRecentSubmissions,
    staleTime: 30 * 1000,
  });

  return {
    submissions: (data ?? []) as Submission[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function useEarningsHistory() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['earningsHistory'],
    queryFn: fetchEarningsHistory,
    staleTime: DASHBOARD_STALE_TIME,
  });

  return {
    earnings: (data ?? []) as EarningsData[],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useBadges() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['badges'],
    queryFn: fetchBadges,
    staleTime: 5 * 60 * 1000,
  });

  return {
    badges: (data ?? []) as Badge[],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
