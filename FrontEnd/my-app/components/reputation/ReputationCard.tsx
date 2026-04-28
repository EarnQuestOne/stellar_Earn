'use client';

import { LevelBadge } from './LevelBadge';
import { XPProgressBar } from './XPProgressBar';
import {
  formatReputationScore,
  getLevelTitle,
  getXPProgress,
} from '@/lib/utils/reputation';

interface ReputationCardProps {
  user: {
    level: number;
    xp: number;
    reputation: number;
    questsCompleted?: number;
  };
  xpForNextLevel: number;
}

export function ReputationCard({ user, xpForNextLevel }: ReputationCardProps) {
  const progress = getXPProgress(user.xp, user.level);
  const levelTitle = getLevelTitle(user.level);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <LevelBadge level={user.level} size="lg" />
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Level {user.level}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {levelTitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Reputation
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatReputationScore(user.reputation)}
          </p>
        </div>
      </div>

      {/* XP Progress Section */}
      <div className="mb-6">
        <XPProgressBar
          currentXP={progress.current}
          xpForNextLevel={progress.needed}
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          {progress.needed - progress.current} XP needed for Level{' '}
          {user.level + 1}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Total XP
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {formatReputationScore(user.xp)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Quests Completed
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {user.questsCompleted ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
