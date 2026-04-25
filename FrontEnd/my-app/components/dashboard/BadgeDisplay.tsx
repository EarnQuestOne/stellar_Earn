'use client';
import type { Badge } from '@/lib/types/dashboard';
import { Skeleton } from '@/components/ui/Skeleton';

interface BadgeDisplayProps {
  badges: Badge[];
  isLoading: boolean;
}

interface BadgeItemProps {
  badge: Badge;
}


function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const rarityStyles: Record<Badge['rarity'], { border: string; bg: string; glow: string }> = {
  common: {
    border: 'border-zinc-300 dark:border-zinc-600',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    glow: '',
  },
  rare: {
    border: 'border-blue-400 dark:border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    glow: 'shadow-blue-200 dark:shadow-blue-900/50 shadow-md',
  },
  epic: {
    border: 'border-purple-400 dark:border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    glow: 'shadow-purple-200 dark:shadow-purple-900/50 shadow-lg',
  },
  legendary: {
    border: 'border-amber-400 dark:border-amber-500',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30',
    glow: 'shadow-amber-300 dark:shadow-amber-800/50 shadow-lg animate-pulse',
  },
};

const rarityLabels: Record<Badge['rarity'], { label: string; color: string }> = {
  common: { label: 'Common', color: 'text-zinc-500 dark:text-zinc-400' },
  rare: { label: 'Rare', color: 'text-blue-600 dark:text-blue-400' },
  epic: { label: 'Epic', color: 'text-purple-600 dark:text-purple-400' },
  legendary: { label: 'Legendary', color: 'text-amber-600 dark:text-amber-400' },
};

function BadgeItem({ badge }: BadgeItemProps) {
  const styles = rarityStyles[badge.rarity];
  const rarityLabel = rarityLabels[badge.rarity];

  return (
    <div
      className="relative"
    >
      {/* Badge */}
      <div
        className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 text-2xl transition-transform hover:scale-110 ${styles.border} ${styles.bg} ${styles.glow}`}
      >
        {badge.icon}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">🏅</div>
      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">No badges yet</h4>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Complete quests and achievements to earn badges
      </p>
    </div>
  );
}

export function BadgeDisplay({ badges, isLoading }: BadgeDisplayProps) {
  // Sort badges by rarity (legendary first)
  const sortedBadges = [...badges].sort((a, b) => {
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  // Count badges by rarity
  const rarityCounts = badges.reduce(
    (acc, badge) => {
      acc[badge.rarity]++;
      return acc;
    },
    { common: 0, rare: 0, epic: 0, legendary: 0 }
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Badges
        </h3>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {isLoading ? '...' : badges.length} earned
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-3 justify-center">
          {[...Array(5)].map((_, i) => (
            <Skeleton.Text key={i} className="h-16 w-16 rounded-full" />
          ))}
        </div>
      ) : badges.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Badges grid */}
          <div className="flex flex-wrap gap-3 justify-center">
            {sortedBadges.map((badge) => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </div>

          {/* Rarity breakdown */}
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex justify-center gap-4 text-xs">
              {rarityCounts.legendary > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {rarityCounts.legendary} Legendary
                  </span>
                </span>
              )}
              {rarityCounts.epic > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {rarityCounts.epic} Epic
                  </span>
                </span>
              )}
              {rarityCounts.rare > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {rarityCounts.rare} Rare
                  </span>
                </span>
              )}
              {rarityCounts.common > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {rarityCounts.common} Common
                  </span>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
