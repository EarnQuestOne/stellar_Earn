'use client';

import { ClaimResult } from '@/lib/stellar/claim';

interface RewardHistoryProps {
  claims: ClaimResult[];
}

export function RewardHistory({ claims }: RewardHistoryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Claim History
      </h3>

      {claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You haven't claimed any rewards yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">Date</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">Amount</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">Status</th>
                  <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {claims.map((claim, index) => (
                  <tr key={claim.transactionHash || index} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400">
                      {new Date(claim.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {claim.amount} Tokens
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
                          onClick={() => claim.transactionHash && navigator.clipboard.writeText(claim.transactionHash)}
                          className="text-zinc-400 hover:text-[#089ec3] transition-colors"
                          title="Copy Hash"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
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
