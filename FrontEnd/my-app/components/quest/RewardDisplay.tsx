'use client';

interface RewardDisplayProps {
  rewardAmount: number;
  rewardAsset: string;
  xpReward: number;
}

export function RewardDisplay({ rewardAmount, rewardAsset, xpReward }: RewardDisplayProps) {
  return (
    <div
      className="rounded-lg border border-zinc-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-6 dark:border-zinc-800 dark:from-orange-900/10 dark:to-yellow-900/10"
      aria-label="Quest rewards"
    >
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
        Quest Rewards
      </h3>

      <div className="space-y-4">
        {/* Primary Reward */}
        <div
          className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900"
          aria-label={`Token reward: ${rewardAmount} ${rewardAsset}`}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30"
            aria-hidden="true"
          >
            <svg
              className="h-6 w-6 text-orange-600 dark:text-orange-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Token Reward</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" aria-hidden="true">
              {rewardAmount} {rewardAsset}
            </div>
          </div>
        </div>

        {/* XP Reward */}
        <div
          className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900"
          aria-label={`Experience points reward: ${xpReward} XP`}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#089ec3]/10"
            aria-hidden="true"
          >
            <svg
              className="h-6 w-6 text-[#089ec3]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Experience Points</div>
            <div className="text-2xl font-bold text-[#089ec3]" aria-hidden="true">+{xpReward} XP</div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
        <div className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Rewards are distributed automatically upon quest approval
          </p>
        </div>
      </div>
    </div>
  );
}
