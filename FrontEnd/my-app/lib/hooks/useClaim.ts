'use client';

import { useState, useCallback } from 'react';
import { claimReward, ClaimResult } from '../stellar/claim';
import { useToast } from '@/components/notifications/Toast';

export type ClaimStatus = 'idle' | 'pending' | 'success' | 'error';

interface UseClaimReturn {
  claim: (rewardId: string, amount: number) => Promise<ClaimResult | null>;
  status: ClaimStatus;
  result: ClaimResult | null;
  error: string | null;
  reset: () => void;
}

export function useClaim(): UseClaimReturn {
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const claim = useCallback(async (rewardId: string, amount: number) => {
    setStatus('pending');
    setError(null);
    setResult(null);

    try {
      const response = await claimReward(rewardId, amount);

      if (response.success) {
        setStatus('success');
        setResult(response);
        showToast(`Successfully claimed ${amount} tokens!`, 'success');
        return response;
      } else {
        setStatus('error');
        setError(response.error || 'Claim failed');
        showToast(response.error || 'Failed to claim reward', 'error');
        return response;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setStatus('error');
      setError(message);
      showToast(message, 'error');
      return null;
    }
  }, [showToast]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    claim,
    status,
    result,
    error,
    reset,
  };
}
