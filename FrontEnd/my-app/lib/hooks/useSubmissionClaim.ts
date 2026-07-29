'use client';

import { useCallback } from 'react';
import { useClaim } from './useClaim';

/**
 * Thin wrapper around useClaim scoped to the submission-detail claim action.
 * Closes #1931.
 */
export function useSubmissionClaim() {
  const { claim, status, result, error, reset } = useClaim();

  const claimFromSubmission = useCallback(
    (_submissionId: string, rewardId: string, amount: number) => {
      return claim(rewardId, amount);
    },
    [claim],
  );

  return {
    claimFromSubmission,
    isClaiming: status === 'pending',
    isClaimed: status === 'success',
    claimError: error,
    claimResult: result,
    resetClaim: reset,
  };
}
