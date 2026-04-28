'use client';

import { SubmissionCard } from './SubmissionCard';
import type { Submission } from '@/lib/types/submission';
import { Skeleton } from '@/components/ui/Skeleton';

interface SubmissionsListProps {
  submissions: Submission[];
  isLoading?: boolean;
  error?: Error | null;
  onSubmissionClick?: (submission: Submission) => void;
}

function LoadingSkeleton() {
  return <Skeleton.List items={3} />;
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        No submissions found
      </h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        You haven&apos;t submitted any quests yet. Start completing quests to
        see your submissions here.
      </p>
    </div>
  );
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
        Error loading submissions
      </h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
    </div>
  );
}

export function SubmissionsList({
  submissions,
  isLoading,
  error,
  onSubmissionClick,
}: SubmissionsListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (submissions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4" id="submissions-list">
      {submissions.map((submission) => (
        <SubmissionCard
          key={submission.id}
          submission={submission}
          onClick={onSubmissionClick}
        />
      ))}
    </div>
  );
}
