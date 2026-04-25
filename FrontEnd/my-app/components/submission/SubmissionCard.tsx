'use client';

import { StatusBadge } from './StatusBadge';
import type { Submission } from '@/lib/types/submission';

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

interface SubmissionCardProps {
  submission: Submission;
  onClick?: (submission: Submission) => void;
}

export function SubmissionCard({ submission, onClick }: SubmissionCardProps) {
  const handleClick = () => {
    onClick?.(submission);
  };

  const formattedDate = formatDate(submission.createdAt);

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
      aria-label={`View submission for ${submission.quest.title}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {submission.quest.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {submission.quest.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-500">
            <span>Submitted {formattedDate}</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {submission.quest.rewardAmount} {submission.quest.rewardAsset}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={submission.status} />
        </div>
      </div>
    </div>
  );
}
