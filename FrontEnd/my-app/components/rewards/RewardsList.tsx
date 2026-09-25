'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { getPayoutHistory } from '@/lib/api/payouts';
import { useFormatter } from '@/lib/hooks/useFormatter';
import type { PayoutResponse, PayoutStatus } from '@/lib/types/api.types';

type SortField = 'createdAt' | 'amount';
type SortDir = 'asc' | 'desc';

const STATUS_BADGE: Record<PayoutStatus, string> = {
  completed:
    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending:
    'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  processing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  retry_scheduled:
    'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

export function RewardsList() {
  const { date, reward } = useFormatter();
  const [payouts, setPayouts] = useState<PayoutResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 10;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayoutHistory({ page, limit: LIMIT });
      const sorted = [...res.payouts].sort((a, b) => {
        const va =
          sortField === 'amount' ? a.amount : new Date(a.createdAt).getTime();
        const vb =
          sortField === 'amount' ? b.amount : new Date(b.createdAt).getTime();
        return sortDir === 'asc' ? va - vb : vb - va;
      });
      setPayouts(sorted);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setError('Failed to load payout history.');
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortDir]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  /** Fix #2216: error state includes a retry button */
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchHistory}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Payout History
        </h3>
        {total > 0 && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {total} total
          </span>
        )}
      </div>

      {/** Fix #2216: improved empty state with helpful copy */}
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            No payout history yet
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Complete and get approved for quests to see your rewards here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <tr>
                    <th
                      className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer hover:text-primary"
                      onClick={() => toggleSort('createdAt')}
                    >
                      Date
                    </th>
                    <th
                      className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer hover:text-primary"
                      onClick={() => toggleSort('amount')}
                    >
                      Amount
                    </th>
                    <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      Asset
                    </th>
                    <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      Status
                    </th>
                    <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      Tx Hash
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {payouts.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400">
                        {date(p.createdAt, 'medium')}
                      </td>
                      <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                        {reward(p.amount, {
                          type: 'custom',
                          label: { singular: p.asset, plural: p.asset },
                        })}
                      </td>
                      <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400">
                        {p.asset}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
                            STATUS_BADGE[p.status]
                          }
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {p.transactionHash ? (
                          <code className="text-xs text-zinc-400 truncate max-w-[7rem]">
                            {p.transactionHash}
                          </code>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400"
              >
                Previous
              </button>
              <span className="text-zinc-500 dark:text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
