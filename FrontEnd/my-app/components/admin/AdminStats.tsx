'use client';

import type { AdminStats as AdminStatsType } from '@/lib/types/admin';

interface AdminStatsProps {
  stats: AdminStatsType | null;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  change?: { value: number; isPositive: boolean };
  color: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, change, color, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="mt-4">
          <div className="h-7 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-1 h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-medium ${change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {change.isPositive ? '+' : ''}{change.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
      </div>
    </div>
  );
}

export function AdminStats({ stats, isLoading }: AdminStatsProps) {
  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Quests"
          value={stats?.totalQuests ?? 0}
          icon="📋"
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Quests"
          value={stats?.activeQuests ?? 0}
          icon="🚀"
          color="green"
          change={{ value: 8, isPositive: true }}
          isLoading={isLoading}
        />
        <StatCard
          title="Completed"
          value={stats?.completedQuests ?? 0}
          icon="✅"
          color="purple"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Participants"
          value={stats?.totalParticipants ?? 0}
          icon="👥"
          color="amber"
          change={{ value: 15, isPositive: true }}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Rewards Distributed"
          value={stats ? `${stats.totalRewardsDistributed.toLocaleString()} XLM` : '0 XLM'}
          icon="💎"
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Reviews"
          value={stats?.pendingSubmissions ?? 0}
          icon="⏳"
          color="amber"
          isLoading={isLoading}
        />
        <StatCard
          title="Approved"
          value={stats?.approvedSubmissions ?? 0}
          icon="👍"
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Rejected"
          value={stats?.rejectedSubmissions ?? 0}
          icon="👎"
          color="red"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Stats Summary */}
      {!isLoading && stats && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Approval Rate
              </p>
              <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                {stats.approvedSubmissions + stats.rejectedSubmissions > 0
                  ? Math.round((stats.approvedSubmissions / (stats.approvedSubmissions + stats.rejectedSubmissions)) * 100)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Avg Participants
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {stats.totalQuests > 0
                  ? Math.round(stats.totalParticipants / stats.totalQuests)
                  : 0}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Avg Reward
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {stats.completedQuests > 0
                  ? Math.round(stats.totalRewardsDistributed / stats.completedQuests)
                  : 0} XLM
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Completion Rate
              </p>
              <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
                {stats.totalQuests > 0
                  ? Math.round((stats.completedQuests / stats.totalQuests) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
