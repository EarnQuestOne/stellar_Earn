'use client';

import { Submission } from '@/lib/types/dashboard';

interface PendingRewardsProps {
  rewards: Submission[];
}

export function PendingRewards({ rewards }: PendingRewardsProps) {
  const totalPending = rewards.reduce((sum, r) => sum + r.reward, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Claimable Rewards
        </h3>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Total: {totalPending} Tokens
        </span>
      </div>

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            No pending rewards to claim.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="group flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {reward.questTitle}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Approved on {new Date(reward.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  +{reward.reward} Tokens
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
