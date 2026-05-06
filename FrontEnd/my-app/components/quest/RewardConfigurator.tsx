'use client';

import { Coins } from 'lucide-react';
import {
  REWARD_ASSETS,
  type RewardAssetType,
} from '@/lib/schemas/quest.schema';

interface RewardConfiguratorProps {
  assetType: RewardAssetType;
  amount: number;
  xpReward: number;
  errors?: {
    amount?: string;
    xpReward?: string;
  };
  onChange: (next: {
    assetType: RewardAssetType;
    amount: number;
    xpReward: number;
  }) => void;
}

const RewardConfigurator = ({
  assetType,
  amount,
  xpReward,
  errors,
  onChange,
}: RewardConfiguratorProps) => {
  const hasAmountError = Boolean(errors?.amount);
  const hasXpError = Boolean(errors?.xpReward);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Token Selector
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {REWARD_ASSETS.map((asset) => {
            const active = asset.value === assetType;
            return (
              <button
                key={asset.value}
                type="button"
                onClick={() =>
                  onChange({ assetType: asset.value, amount, xpReward })
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-cyan-500 bg-cyan-50 shadow-sm dark:bg-cyan-950/40'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {asset.value}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {asset.name}
                </p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {asset.issuer}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Reward Amount
          </span>
          <div className="relative">
            <Coins
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) =>
                onChange({
                  assetType,
                  amount: Number(event.target.value),
                  xpReward,
                })
              }
              className={`w-full rounded-xl border bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-50 ${
                hasAmountError
                  ? 'border-red-400 focus:border-red-500 dark:border-red-800'
                  : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
              }`}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            XP Reward
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={xpReward}
            onChange={(event) =>
              onChange({
                assetType,
                amount,
                xpReward: Number(event.target.value),
              })
            }
            className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none dark:bg-zinc-800 dark:text-zinc-50 ${
              hasXpError
                ? 'border-red-400 focus:border-red-500 dark:border-red-800'
                : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
            }`}
          />
        </label>
      </div>
    </div>
  );
};

export default RewardConfigurator;
