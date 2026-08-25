'use client';

import { useState } from 'react';

interface ClaimRetryButtonProps {
  onClaim: () => Promise<void>;
  label?: string;
}

/**
 * Fix #2222: retry UI for failed reward claims.
 * Shows an error message and a Retry button when a claim attempt fails,
 * instead of leaving the user with no feedback.
 */
export function ClaimRetryButton({
  onClaim,
  label = 'Claim Reward',
}: ClaimRetryButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClaim = async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      await onClaim();
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Claim failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleClaim}
        disabled={status === 'loading'}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === 'loading' ? 'Claiming...' : status === 'error' ? 'Retry' : label}
      </button>
      {status === 'error' && errorMsg && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </p>
      )}
    </div>
  );
}