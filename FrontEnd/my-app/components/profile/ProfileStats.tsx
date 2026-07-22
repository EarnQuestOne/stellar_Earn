'use client';

import React from 'react';
import type { ProfileStats as ProfileStatsType } from '@/lib/types/profile';
import { useFormatter } from '@/lib/hooks/useFormatter';

interface ProfileStatsProps {
  stats: ProfileStatsType;
  isLoading?: boolean;
}

const StatCard: React.FC<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <div className="flex flex-col items-center rounded-lg bg-slate-800/40 p-4 text-center">
    <span className="text-2xl font-bold text-white">{value}</span>
    <span className="mt-1 text-xs text-zinc-400">{label}</span>
  </div>
);

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  stats,
  isLoading,
}) => {
  const { date } = useFormatter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-slate-800/50"
          />
        ))}
      </div>
    );
  }

  const joinLabel = stats.joinDate
    ? `Joined ${date(stats.joinDate, 'medium')}`
    : null;

  return (
    <section aria-label="Profile statistics">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Level" value={stats.level} />
        <StatCard label="XP" value={stats.xp.toLocaleString()} />
        <StatCard label="Quests Completed" value={stats.questsCompleted} />
        <StatCard
          label="Total Earned"
          value={stats.totalEarnings.toLocaleString()}
        />
        <StatCard
          label="Current Streak"
          value={`${stats.currentStreak} days`}
        />
        <StatCard label="Followers" value={stats.followersCount} />
        <StatCard label="Following" value={stats.followingCount} />
        {joinLabel && (
          <div className="col-span-2 flex items-center justify-center rounded-lg bg-slate-800/40 p-4 text-center sm:col-span-4">
            <span className="text-xs text-zinc-400">{joinLabel}</span>
          </div>
        )}
      </div>
    </section>
  );
};
