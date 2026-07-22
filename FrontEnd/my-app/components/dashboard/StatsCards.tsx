'use client';

import type { UserStats } from '@/lib/types/dashboard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormatter } from '@/lib/hooks/useFormatter';

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

function StatCard({
  title,
  value,
  icon,
  iconBg,
  trend,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        role="status"
        aria-label={`Loading ${title} statistic`}
        aria-busy="true"
      >
        <div className="flex items-center justify-between mb-4">
          <Skeleton.Text className="h-10 w-10 rounded-lg" />
          <Skeleton.Text className="h-4 w-12" />
        </div>
        <Skeleton.Text className="h-8 w-20 mb-1" />
        <Skeleton.Text className="h-4 w-24" />
      </div>
    );
  }

  const trendLabel = trend
    ? `${trend.isPositive ? 'Increase' : 'Decrease'} of ${trend.value}`
    : undefined;

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      aria-label={`${title}: ${value}${trendLabel ? `, ${trendLabel}` : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
            aria-label={trendLabel}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  trend.isPositive
                    ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                    : 'M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6'
                }
              />
            </svg>
            <span aria-hidden="true">{trend.value}</span>
          </span>
        )}
      </div>
      <p
        className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
        aria-hidden="true"
      >
        {value}
      </p>
      <p
        className="text-sm text-zinc-500 dark:text-zinc-400"
        aria-hidden="true"
      >
        {title}
      </p>
    </div>
  );
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  // useFormatter reads navigator.language once — all returned functions
  // are memoised and locale-bound, no prop drilling needed.
  const { reward } = useFormatter();

  const successRate =
    stats?.successRate !== undefined
      ? stats.successRate
      : (stats?.questsCompleted ?? 0) > 0
        ? Math.round(
            ((stats?.questsCompleted ?? 0) /
              ((stats?.questsCompleted ?? 0) + (stats?.failedQuests ?? 0))) *
              100
          )
        : 94;

  const totalEarned = Number(stats?.totalEarned || 2450);

  // ── Formatted values ──────────────────────────────────────────────────────
  //
  // Before: `${totalEarned.toLocaleString()} XLM`
  //   → Always used runtime default locale (unpredictable on server),
  //     no control over fraction digits, asset label not separated.
  //
  // After: reward() with type:'custom' and explicit label
  //   → Locale-correct digit grouping (e.g. "2,450 XLM" en-US,
  //     "2.450 XLM" de-DE), consistent across SSR and client.
  //
  // Before: `${successRate}%`
  //   → Raw concatenation — some locales place the % differently
  //     (e.g. French uses "94 %" with a non-breaking space before %).
  //
  // After: reward() with type:'percentage'
  //   → Intl.NumberFormat handles symbol placement and spacing
  //     correctly for every locale automatically.
  //
  const formattedEarned = reward(totalEarned, {
    type: 'custom',
    label: { singular: 'XLM', plural: 'XLM' },
  });

  const formattedSuccessRate = reward(successRate / 100, {
    type: 'percentage',
    maximumFractionDigits: 0,
  });

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      role="region"
      aria-label="Dashboard statistics"
    >
      <StatCard
        title="Active Quests"
        value={5}
        icon={
          <span className="text-cyan-400" aria-hidden="true">
            🎯
          </span>
        }
        iconBg="bg-cyan-400/10"
        trend={{ value: '+2', isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Completed"
        value={stats?.questsCompleted ?? 42}
        icon={
          <span className="text-emerald-400" aria-hidden="true">
            ✓
          </span>
        }
        iconBg="bg-emerald-400/10"
        trend={{ value: '+8', isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Earned"
        value={formattedEarned}
        icon={
          <span className="text-amber-400" aria-hidden="true">
            💰
          </span>
        }
        iconBg="bg-amber-400/10"
        trend={{ value: '+12%', isPositive: true }}
        isLoading={isLoading}
      />
      <StatCard
        title="Success Rate"
        value={formattedSuccessRate}
        icon={
          <span className="text-purple-400" aria-hidden="true">
            📈
          </span>
        }
        iconBg="bg-purple-400/10"
        trend={{ value: '+2%', isPositive: true }}
        isLoading={isLoading}
      />
    </div>
  );
}
