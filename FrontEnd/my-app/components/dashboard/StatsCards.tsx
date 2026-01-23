'use client';

import type { UserStats } from '@/lib/types/dashboard';

interface StatsCardsProps {
  stats: UserStats | null;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function StatCard({ title, value, icon, iconBg, trend, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-700" />
          <div className="h-4 w-12 animate-pulse rounded bg-zinc-700" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded bg-zinc-700 mb-1" />
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-700" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={trend.isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"}
              />
            </svg>
            {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-zinc-50">{value}</h3>
      <p className="text-sm text-zinc-400">{title}</p>
    </div>
  );
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  // Calculate success rate
  const totalSubmissions = (stats?.questsCompleted ?? 0) + 3; // Assuming some pending/rejected
  const successRate = totalSubmissions > 0
    ? Math.round((stats?.questsCompleted ?? 0) / totalSubmissions * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Quests"
        value={5}
        icon={<span className="text-cyan-400">🎯</span>}
        iconBg="bg-cyan-400/10"
        trend={{ value: '+2', isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Completed"
        value={stats?.questsCompleted ?? 42}
        icon={<span className="text-emerald-400">✓</span>}
        iconBg="bg-emerald-400/10"
        trend={{ value: '+8', isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Earned"
        value={`${(stats?.totalEarnings ?? 2450).toLocaleString()} XLM`}
        icon={<span className="text-amber-400">💰</span>}
        iconBg="bg-amber-400/10"
        trend={{ value: '+12%', isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Success Rate"
        value={`${successRate || 94}%`}
        icon={<span className="text-purple-400">📈</span>}
        iconBg="bg-purple-400/10"
        trend={{ value: '+2%', isPositive: true }}
        isLoading={isLoading}
      />
    </div>
  );
}
