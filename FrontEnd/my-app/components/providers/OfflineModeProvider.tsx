'use client';

/**
 * OfflineModeProvider – FE-027
 *
 * Wraps children with network-aware fallback behaviour:
 *
 *  • Device offline  → renders `<OfflineFallback />`
 *  • Online but API unreachable → renders `<ApiUnreachableFallback />`
 *  • Both reachable  → renders children normally
 *
 * The provider mounts `useNetworkStatus` exactly once at the top of the tree
 * so all descendant hooks that read `isOnline` / `isApiReachable` from the
 * store stay in sync automatically.
 */

import React, { useState, useCallback } from 'react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { OfflineFallback } from '@/components/error/OfflineFallback';
import { ApiUnreachableFallback } from '@/components/error/ApiUnreachableFallback';

interface OfflineModeProviderProps {
  children: React.ReactNode;
  /**
   * When `true` (default) the provider gates all children behind connectivity
   * checks and renders the appropriate fallback.
   *
   * Set to `false` to disable the gate (useful in tests or storybook).
   */
  enabled?: boolean;
}

export function OfflineModeProvider({
  children,
  enabled = true,
}: OfflineModeProviderProps) {
  const { isOnline, isApiReachable, recheckApi } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsChecking(true);
    try {
      await recheckApi();
    } finally {
      setIsChecking(false);
    }
  }, [recheckApi]);

  if (!enabled) {
    return <>{children}</>;
  }

  // Device has no internet connection at all.
  if (!isOnline) {
    return <OfflineFallback onRetry={handleRetry} />;
  }

  // Device is online but the API base URL is not responding.
  if (!isApiReachable) {
    return (
      <ApiUnreachableFallback onRetry={handleRetry} isChecking={isChecking} />
    );
  }

  return <>{children}</>;
}
