'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { ClaimResult } from '@/lib/stellar/claim';
import { useFormatter } from '@/lib/hooks/useFormatter';
import type {
  DateFormatStyle,
  RewardFormatOptions,
} from '@/lib/utils/i18n-formatters';

/** Number of rows rendered per page for lazy pagination. */
const PAGE_SIZE = 10;

interface RewardHistoryProps {
  claims: ClaimResult[];
}

/* ── Row component (memoized) ──────────────────────────────────────────
   Wrapped in React.memo so each row only re-renders when its own claim
   data changes — parent state updates that don't affect a specific row
   are now skipped entirely.
   ────────────────────────────────────────────────────────────────────── */

interface RewardRowProps {
  claim: ClaimResult;
  date: (value: Date | number | string, style?: DateFormatStyle) => string;
  reward: (value: number | string, options: RewardFormatOptions) => string;
}

const RewardRow = React.memo(function RewardRow({
  claim,
  date,
  reward,
}: RewardRowProps) {
  return (
    <tr className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400">
        {date(claim.timestamp, 'medium')}
      </td>

      <td className="px-4 py-4">
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {reward(Number(claim.amount), {
            type: 'custom',
            label: { singular: 'Token', plural: 'Tokens' },
          })}
        </span>
      </td>

      <td className="px-4 py-4">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Success
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <code className="text-xs text-zinc-400 truncate max-w-30">
            {claim.transactionHash}
          </code>
          <button
            onClick={() =>
              claim.transactionHash &&
              navigator.clipboard.writeText(claim.transactionHash)
            }
            className="text-zinc-400 hover:text-primary transition-colors"
            title="Copy Hash"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
});

/* ── Main component ────────────────────────────────────────────────────
   • `sortedClaims` — useMemo'd, sorted newest-first by timestamp.
     Recomputes only when the `claims` array reference or contents change.
   • Incremental rendering — only `PAGE_SIZE` rows mount at a time.
     A "Load More" button appends the next page of rows to the DOM.
   ────────────────────────────────────────────────────────────────────── */

export function RewardHistory({ claims }: RewardHistoryProps) {
  const { date, reward } = useFormatter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* useMemo: sort claims newest-first, keyed on the claims array. */
  const sortedClaims = useMemo(() => {
    return [...claims].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [claims]);

  /* Slice to only the visible subset for lazy rendering. */
  const visibleClaims = useMemo(
    () => sortedClaims.slice(0, visibleCount),
    [sortedClaims, visibleCount]
  );

  const hasMore = visibleCount < sortedClaims.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Claim History
      </h3>

      {sortedClaims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You haven&apos;t claimed any rewards yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {visibleClaims.map((claim, index) => (
                  <RewardRow
                    key={claim.transactionHash || `row-${index}`}
                    claim={claim}
                    date={date}
                    reward={reward}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleLoadMore}
                className="w-full px-4 py-3 text-sm font-medium text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                Load more ({sortedClaims.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
