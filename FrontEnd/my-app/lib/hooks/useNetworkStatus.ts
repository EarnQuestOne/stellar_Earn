'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '../api/client';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isApiReachable, setIsApiReachable] = useState<boolean>(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setIsApiReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    const checkApiHealth = async () => {
      try {
        await getApiClient().get('/health', { timeout: 5000 });
        setIsApiReachable(true);
      } catch (err) {
        setIsApiReachable(false);
      }
    };

    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return { isOnline, isApiReachable };
}
