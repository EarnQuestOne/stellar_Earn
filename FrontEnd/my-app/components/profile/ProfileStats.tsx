'use client';

import type { ProfileStats } from '@/lib/types/profile';

interface ProfileStatsProps {
  stats: ProfileStats;
  isLoading: boolean;
}

export function ProfileStats({ stats, isLoading }: ProfileStatsProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="text-center">
              <div className="h-8 bg-zinc-800 rounded w-3/4 mx-auto mb-2 animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-1/2 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: 'Total XP',
      value: stats.xp.toLocaleString(),
      icon: '⚡',
      color: 'text-cyan-400',
    },
    {
      label: 'Level',
      value: stats.level.toString(),
      icon: '🏆',
      color: 'text-yellow-400',
    },
    {
      label: 'Quests Completed',
      value: stats.questsCompleted.toString(),
      icon: '🎯',
      color: 'text-green-400',
    },
    {
      label: 'Total Earnings',
      value: `${stats.totalEarnings.toLocaleString()} XLM`,
      icon: '💰',
      color: 'text-purple-400',
    },
    {
      label: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: '🔥',
      color: 'text-orange-400',
    },
    {
      label: 'Followers',
      value: stats.followersCount.toString(),
      icon: '👥',
      color: 'text-blue-400',
    },
    {
      label: 'Following',
      value: stats.followingCount.toString(),
      icon: '👤',
      color: 'text-pink-400',
    },
    {
      label: 'Member Since',
      value: new Date(stats.joinDate).getFullYear().toString(),
      icon: '📅',
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statItems.map((item, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className={`text-2xl font-bold ${item.color} mb-1`}>
              {item.value}
            </div>
            <div className="text-sm text-zinc-400">{item.label}</div>
          </div>
        ))}
      </div>
      
      {/* Progress bar for next level */}
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-400">Progress to Level {stats.level + 1}</span>
          <span className="text-sm text-zinc-300">65% Complete</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" 
            style={{ width: '65%' }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>Level {stats.level}</span>
          <span>Level {stats.level + 1}</span>
        </div>
      </div>
    </div>
  );
}