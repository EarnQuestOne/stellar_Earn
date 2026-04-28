'use client';

import { useState } from 'react';
import type { Badge } from '@/lib/types/reputation';

interface BadgeGalleryProps {
  badges: Badge[];
  earnedBadgeIds: string[];
  onBadgeClick?: (badge: Badge) => void;
}

const rarityColors = {
  common: 'border-zinc-300 dark:border-zinc-700',
  rare: 'border-blue-400 dark:border-blue-600',
  epic: 'border-purple-400 dark:border-purple-600',
  legendary: 'border-yellow-400 dark:border-yellow-600',
};

function BadgeCard({
  badge,
  isEarned,
  onClick,
}: {
  badge: Badge;
  isEarned: boolean;
  onClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
    >
      <div
        className={`relative rounded-lg border-2 p-4 transition-all cursor-pointer ${
          isEarned
            ? `${rarityColors[badge.rarity]} bg-white dark:bg-zinc-900 hover:scale-105 hover:shadow-md`
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 opacity-50 grayscale'
        }`}
      >
        {/* Badge Icon */}
        <div className="flex items-center justify-center h-16 w-16 mx-auto mb-2">
          {badge.icon ? (
            <div className="text-4xl">{badge.icon}</div>
          ) : (
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: '#089ec3' }}
            >
              🏆
            </div>
          )}
        </div>

        {/* Badge Name */}
        <p className="text-sm font-medium text-center text-zinc-900 dark:text-zinc-50 truncate">
          {badge.name}
        </p>

        {/* Lock Icon for Locked Badges */}
        {!isEarned && (
          <div className="absolute top-2 right-2">
            <svg
              className="h-5 w-5 text-zinc-400 dark:text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-sm shadow-xl">
            <p className="font-semibold mb-1">{badge.name}</p>
            <p className="text-zinc-300 dark:text-zinc-400 text-xs mb-2">
              {badge.description}
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs">
              Requirement: {badge.requirement}
            </p>
            {isEarned && badge.unlockedAt && (
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
              </p>
            )}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
              <div className="border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <svg
        className="h-12 w-12 text-zinc-400 dark:text-zinc-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        No badges available
      </h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Badges will appear here as you complete quests and achievements.
      </p>
    </div>
  );
}

export function BadgeGallery({
  badges,
  earnedBadgeIds,
  onBadgeClick,
}: BadgeGalleryProps) {
  if (badges.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {badges.map((badge) => {
        const isEarned = earnedBadgeIds.includes(badge.id);
        return (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isEarned={isEarned}
            onClick={() => onBadgeClick?.(badge)}
          />
        );
      })}
    </div>
  );
}
