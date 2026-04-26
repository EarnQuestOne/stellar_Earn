'use client';

import { QuestStatus, QuestDifficulty } from '@/lib/types/quest';

interface QuestHeaderProps {
  title: string;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  category: string;
  currentParticipants?: number;
  maxParticipants?: number;
}

const statusConfig = {
  [QuestStatus.ACTIVE]: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  [QuestStatus.PAUSED]: {
    label: 'Paused',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  [QuestStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  [QuestStatus.EXPIRED]: {
    label: 'Expired',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

const difficultyConfig = {
  [QuestDifficulty.EASY]: {
    label: 'Easy',
    className: 'bg-green-500 text-white',
  },
  [QuestDifficulty.MEDIUM]: {
    label: 'Medium',
    className: 'bg-orange-500 text-white',
  },
  [QuestDifficulty.HARD]: {
    label: 'Hard',
    className: 'bg-red-500 text-white',
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

export function QuestHeader({
  title,
  status,
  difficulty,
  category,
  currentParticipants = 0,
  maxParticipants,
}: QuestHeaderProps) {
  const statusInfo = statusConfig[status];
  const difficultyInfo = difficultyConfig[difficulty];
  const categoryColor = categoryColors[category] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Status and Badges */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Quest metadata">
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}
          aria-label={`Status: ${statusInfo.label}`}
        >
          <span aria-hidden="true">{statusInfo.icon}</span>
          {statusInfo.label}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColor}`}
          aria-label={`Category: ${category}`}
        >
          {category}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${difficultyInfo.className}`}
          aria-label={`Difficulty: ${difficultyInfo.label}`}
        >
          {difficultyInfo.label}
        </span>
      </div>

      {/* Title */}
      <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h1>

      {/* Participants Info */}
      {maxParticipants !== undefined && (
        <div
          className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          aria-label={`Participants: ${currentParticipants} of ${maxParticipants}${currentParticipants >= maxParticipants ? ', quest is full' : ''}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span aria-hidden="true">
            {currentParticipants} / {maxParticipants} participants
          </span>
          {currentParticipants >= maxParticipants && (
            <span
              className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
              role="status"
            >
              Full
            </span>
          )}
        </div>
      )}
    </div>
  );
}
