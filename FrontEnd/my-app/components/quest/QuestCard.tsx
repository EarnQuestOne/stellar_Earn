'use client';

import type { Quest } from '@/lib/types/quest';
import { QuestDifficulty } from '@/lib/types/quest';

interface QuestCardProps {
  quest: Quest;
  onClick?: (quest: Quest) => void;
}

function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffInMs = deadlineDate.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) return 'Expired';
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return '1 day left';
  return `${diffInDays} days left`;
}

const difficultyColors = {
  [QuestDifficulty.EASY]: {
    bg: 'bg-green-500',
    text: 'text-white',
  },
  [QuestDifficulty.MEDIUM]: {
    bg: 'bg-orange-500',
    text: 'text-white',
  },
  [QuestDifficulty.HARD]: {
    bg: 'bg-red-500',
    text: 'text-white',
  },
};

const categoryColors: Record<string, string> = {
  Security: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  Frontend: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Backend: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Docs: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Testing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Community: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function QuestCard({ quest, onClick }: QuestCardProps) {
  const handleClick = () => {
    onClick?.(quest);
  };

  const difficultyColor = difficultyColors[quest.difficulty];
  const categoryColor = categoryColors[quest.category] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View quest: ${quest.title}`}
    >
      {/* Tags */}
      <div className="mb-4 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColor}`}>
          {quest.category}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyColor.bg} ${difficultyColor.text}`}>
          {quest.difficulty}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-[#089ec3] dark:group-hover:text-[#0ab8d4] transition-colors line-clamp-2">
        {quest.title}
      </h3>

      {/* Description */}
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
        {quest.description}
      </p>

      {/* Rewards and Deadline */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{quest.rewardAmount} {quest.rewardAsset}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#089ec3]">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">+{quest.xpReward} XP</span>
          </div>
        </div>
        {quest.deadline && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{formatTimeRemaining(quest.deadline)}</span>
          </div>
        )}
      </div>

      {/* View Quest Link */}
      <div className="flex items-center justify-end">
        <span className="flex items-center gap-1 text-sm font-medium text-[#089ec3] group-hover:text-[#0ab8d4] transition-colors">
          View Quest
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
