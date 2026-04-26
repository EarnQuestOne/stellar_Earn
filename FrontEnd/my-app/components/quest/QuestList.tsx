'use client';

import { QuestCard } from './QuestCard';
import { EmptyQuestState } from './EmptyQuestState';
import type { Quest } from '@/lib/types/quest';
import { Skeleton } from '@/components/ui/Skeleton';
import { memo } from 'react';

interface QuestListProps {
  quests: Quest[];
  isLoading?: boolean;
  error?: Error | null;
  onQuestClick?: (quest: Quest) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <svg
        className="h-12 w-12 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Error loading quests
      </h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
    </div>
  );
}

export const QuestList = memo(({
  quests,
  isLoading,
  error,
  onQuestClick,
  hasActiveFilters,
  onClearFilters,
}: QuestListProps) => {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Loading quests"
        aria-busy="true"
      >
        {[...Array(6)].map((_, i) => (
          <Skeleton.Card key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (quests.length === 0) {
    return (
      <EmptyQuestState
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label={`${quests.length} quest${quests.length !== 1 ? 's' : ''} found`}
    >
      {quests.map((quest) => (
        <div key={quest.id} role="listitem">
          <QuestCard quest={quest} onClick={onQuestClick} />
        </div>
      ))}
    </div>
  );
});

QuestList.displayName = 'QuestList';
