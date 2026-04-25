'use client';
import type { Submission } from '@/lib/types/submission';
import type { SubmissionStatus } from '@/lib/types/api.types';
import { Skeleton } from '@/components/ui/Skeleton';

interface RecentSubmissionsProps {
  submissions: Submission[];
  isLoading: boolean;
}

interface SubmissionRowProps {
  submission: Submission;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    }
    return `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}


function StatusBadge({ status }: { status: Submission['status'] }) {
  const statusConfig = {
    Pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: '⏳',
    },
    Approved: {
      label: 'Approved',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: '✓',
    },
    Rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: '✗',
    },
    Paid: {
      label: 'Paid',
      className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      icon: '💰',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function SubmissionRow({ submission }: SubmissionRowProps) {
  const questTitle = submission.quest?.title || 'Unknown Quest';
  const reward = submission.quest?.rewardAmount || 0;
  const isApproved = submission.status === 'Approved' || submission.status === 'Paid';

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <td className="py-3 pr-4">
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
            {questTitle}
          </span>
          {submission.rejectionReason && (
            <span className="text-xs text-red-500 truncate max-w-[200px]">
              {submission.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4">
        <StatusBadge status={submission.status} />
      </td>
      <td className="py-3 pr-4">
        <span
          className={`font-medium ${
            isApproved
              ? 'text-green-600 dark:text-green-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {isApproved ? '+' : ''}{reward} XLM
        </span>
      </td>
      <td className="py-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        {formatDate(submission.createdAt)}
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">📋</div>
      <h4 className="font-medium text-zinc-900 dark:text-zinc-50">No submissions yet</h4>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Complete quests to see your submissions here
      </p>
    </div>
  );
}

export function RecentSubmissions({ submissions, isLoading }: RecentSubmissionsProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Recent Submissions
        </h3>
        <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
          View All
        </button>
      </div>

      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Quest
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Reward
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, index) => (
                <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-3 pr-4">
                    <Skeleton.Text className="h-5 w-40" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton.Text className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton.Text className="h-5 w-16" />
                  </td>
                  <td className="py-3">
                    <Skeleton.Text className="h-5 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Quest
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Reward
                </th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <SubmissionRow key={submission.id} submission={submission} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
