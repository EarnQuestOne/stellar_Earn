'use client';

import { Submission } from '@/lib/types/submission';
import { SubmissionStatus } from '@/lib/types/submission';

interface PendingRewardsProps {
  rewards: Submission[];
}

/** Returns a badge label + colour for the reward confirmation state (#2227) */
function getStateLabel(status: SubmissionStatus) {
  if (status === SubmissionStatus.APPROVED) {
    return {
      label: 'Confirmed',
      className:
        'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };
  }
  return {
    label: 'Pending',
    className:
      'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
}

export function PendingRewards({ rewards }: PendingRewardsProps) {
  const totalPending = rewards.reduce(
    (sum, r) => sum + (Number(r.quest?.rewardAmount) || 0),
    0
  );

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
        <div
          className="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800"
          role="status"
        >
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            No pending rewards to claim.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rewards.map((reward) => {
            const rewardAmount = Number(reward.quest?.rewardAmount) || 0;
            const questTitle = reward.quest?.title || 'Unknown Quest';
            const state = getStateLabel(reward.status);
            return (
              <li
                key={reward.id}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {questTitle}
                  </h4>
                  {/* Show pending vs confirmed state badge */}
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${state.className}`}
                  >
                    {state.label}
                  </span>
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  +{rewardAmount} Tokens
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
