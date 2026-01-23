'use client';

import { useUserStats } from '@/lib/hooks/useUserStats';
import {
  DashboardLayout,
  StatsCards,
  ActiveQuests,
} from '@/components/dashboard';

export default function DashboardPage() {
  const {
    stats,
    activeQuests,
    isLoading,
    error,
    refetch,
  } = useUserStats();

  if (error) {
    return (
      <DashboardLayout user={{ username: 'john.doe', level: 12 }}>
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-800 bg-red-900/20 p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-red-200">
            Failed to load dashboard
          </h2>
          <p className="mt-1 text-sm text-red-300">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={{ username: 'john.doe', level: 12 }}>
      {/* Welcome Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">
          Welcome back, John <span className="inline-block animate-wave">👋</span>
        </h1>
        <p className="mt-1 text-zinc-400">
          Here&apos;s what&apos;s happening with your quests today.
        </p>
      </header>

      {/* Stats Cards */}
      <section className="mb-8">
        <StatsCards stats={stats} isLoading={isLoading} />
      </section>

      {/* Active Quests */}
      <section>
        <ActiveQuests quests={activeQuests} isLoading={isLoading} />
      </section>
    </DashboardLayout>
  );
}
