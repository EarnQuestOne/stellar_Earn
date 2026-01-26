'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, UserStats, Quest, Submission, EarningsData, Badge } from '../types/dashboard';
import {
  fetchUserStats,
  fetchActiveQuests,
  fetchRecentSubmissions,
  fetchEarningsHistory,
  fetchBadges,
  fetchDashboardData,
} from '../api/user';

interface UseUserStatsReturn {
  stats: UserStats | null;
  activeQuests: Quest[];
  recentSubmissions: Submission[];
  earningsHistory: EarningsData[];
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserStats(): UseUserStatsReturn {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<EarningsData[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchDashboardData();
      setStats(data.stats);
      setActiveQuests(data.activeQuests);
      setRecentSubmissions(data.recentSubmissions);
      setEarningsHistory(data.earningsHistory);
      setBadges(data.badges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    activeQuests,
    recentSubmissions,
    earningsHistory,
    badges,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Individual hooks for more granular data fetching
export function useStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { stats, isLoading, error };
}

export function useActiveQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveQuests()
      .then(setQuests)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { quests, isLoading, error };
}

export function useRecentSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecentSubmissions();
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { submissions, isLoading, error, refetch: fetchData };
}

export function useEarningsHistory() {
  const [earnings, setEarnings] = useState<EarningsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarningsHistory()
      .then(setEarnings)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { earnings, isLoading, error };
}

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBadges()
      .then(setBadges)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { badges, isLoading, error };
}
