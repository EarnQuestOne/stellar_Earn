import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWalletBalanceOptions {
  address?: string;
  intervalMs?: number;
  debounceMs?: number;
}

export function useWalletBalance({
  address,
  intervalMs = 10000,
  debounceMs = 500,
}: UseWalletBalanceOptions = {}) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!address || !isVisible) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/wallet/balance?address=${address}`);
      const data = await res.json();
      setBalance(data.balance);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    } finally {
      setLoading(false);
    }
  }, [address, isVisible]);

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchBalance();
    }, debounceMs);
  }, [fetchBalance, debounceMs]);

  useEffect(() => {
    if (!address || !isVisible) return;

    debouncedFetch();

    const intervalId = setInterval(() => {
      fetchBalance();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [address, isVisible, intervalMs, debouncedFetch, fetchBalance]);

  return { balance, loading, refetch: debouncedFetch };
}
