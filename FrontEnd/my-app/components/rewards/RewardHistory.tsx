'use client';

import { ClaimResult } from '@/lib/stellar/claim';
import { useFormatter } from '@/lib/hooks/useFormatter';

interface RewardHistoryProps {
  claims: ClaimResult[];
}

export function RewardHistory({ claims }: RewardHistoryProps) {
  const { date, reward } = useFormatter();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Claim History
      </h3>

      {claims.length === 0 ? (
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
                {claims.map((claim, index) => (
                  <tr
                    key={claim.transactionHash || index}
                    className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {/*
                      ── Date change ────────────────────────────────────────
                      Before: new Date(claim.timestamp).toLocaleDateString()
                        → No locale argument — falls back to the runtime
                          default which is 'en-US' on most servers, but the
                          user's locale on the client → hydration mismatch.

                      After: date(claim.timestamp, 'medium')
                        → Reads navigator.language via useFormatter.
                          Consistent between renders. e.g. "May 30, 2026"
                          (en-US), "30 mai 2026" (fr-FR), "30. Mai 2026" (de-DE).
                      ──────────────────────────────────────────────────────
                    */}
                    <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400">
                      {date(claim.timestamp, 'medium')}
                    </td>

                    {/*
                      ── Amount change ──────────────────────────────────────
                      Before: {claim.amount} Tokens
                        → Raw number, no digit grouping.
                          Large amounts like 1200 show as "1200 Tokens".

                      After: reward() with type:'custom' and Token label
                        → "1,200 Tokens" (en-US) / "1.200 Tokens" (de-DE).
                          Number() cast handles both number and string amount.
                      ──────────────────────────────────────────────────────
                    */}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
