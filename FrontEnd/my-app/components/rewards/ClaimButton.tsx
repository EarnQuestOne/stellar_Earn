'use client';

import { ClaimStatus } from '@/lib/hooks/useClaim';

interface ClaimButtonProps {
  onClick: () => void;
  status: ClaimStatus;
  disabled?: boolean;
}

export function ClaimButton({ onClick, status, disabled }: ClaimButtonProps) {
  const isLoading = status === 'pending';

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        relative w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all
        ${isLoading ? 'cursor-not-allowed opacity-80' : 'hover:scale-[1.02] active:scale-[0.98]'}
        ${disabled ? 'cursor-not-allowed bg-zinc-400' : 'bg-[#089ec3] hover:bg-[#078dae]'}
      `}
      aria-label={isLoading ? 'Processing transaction, please wait' : disabled ? 'Claim rewards unavailable' : 'Claim all rewards'}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing Transaction...
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Claim All Rewards
        </>
      )}
    </button>
  );
}
