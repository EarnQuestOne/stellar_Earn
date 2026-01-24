'use client';

import { useState } from 'react';
import { submitClaimTransaction, TransactionResult } from '@/lib/stellar/claim';

interface UseClaimReturn {
  loading: boolean;
  error: string | null;
  transactionResult: TransactionResult | null;
  claim: (rewardId: string, amount: number) => Promise<void>;
  reset: () => void;
}

export function useClaim(): UseClaimReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

  const claim = async (rewardId: string, amount: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitClaimTransaction(rewardId, amount);
      setTransactionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setTransactionResult(null);
  };

  return { loading, error, transactionResult, claim, reset };
}
