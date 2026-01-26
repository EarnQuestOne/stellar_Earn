'use client';

import { Modal } from '@/components/ui/Modal';
import { ClaimStatus } from '@/lib/hooks/useClaim';
import { ClaimResult } from '@/lib/stellar/claim';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ClaimStatus;
  result: ClaimResult | null;
  error: string | null;
}

export function TransactionModal({ isOpen, onClose, status, result, error }: TransactionModalProps) {
  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <Modal isOpen={isOpen} onClose={isPending ? () => {} : onClose} title="Claim Transaction">
      <div className="flex flex-col items-center justify-center py-6 space-y-6">
        {isPending && (
          <>
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-zinc-100 border-t-[#089ec3] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-8 w-8 text-[#089ec3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a9.003 9.003 0 008.384-5.562M18 10.5V12m-6.75 3.5l.054-.09A10.003 10.003 0 0012 21a9.003 9.003 0 008.384-5.562M12 9V7m0 2v2m0-2l.054-.09A10.003 10.003 0 0012 21a9.003 9.003 0 008.384-5.562M12 9V7m0 2v2m0-2l.054-.09A10.003 10.003 0 0012 21a9.003 9.003 0 008.384-5.562" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Processing Claim</h4>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Please approve the transaction in your wallet and wait for confirmation on the Stellar network.</p>
            </div>
          </>
        )}

        {isSuccess && result && (
          <>
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900/30">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Claim Successful!</h4>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{result.amount} Tokens have been sent to your wallet.</p>
            </div>
            <div className="w-full bg-zinc-50 rounded-xl p-4 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 dark:text-zinc-400">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-zinc-600 break-all dark:text-zinc-300 bg-white p-2 rounded border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                  {result.transactionHash}
                </code>
                <button 
                   onClick={() => result.transactionHash && navigator.clipboard.writeText(result.transactionHash)}
                   className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-zinc-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Done
            </button>
          </>
        )}

        {isError && (
          <>
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center dark:bg-red-900/30">
              <svg className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Transaction Failed</h4>
              <p className="mt-1 text-sm text-red-500">{error || 'Something went wrong with the transaction.'}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-zinc-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
