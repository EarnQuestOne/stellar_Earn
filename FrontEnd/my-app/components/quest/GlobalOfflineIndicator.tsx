'use client';

import React from 'react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { OfflineIndicator } from './OfflineIndicator';

/**
 * App-wide offline banner.
 *
 * Mounted once in the root layout so every page reports connectivity loss.
 * Reads connectivity from the global store (see `useOnlineStatus`), which is
 * initialised in an effect rather than during render, so server-rendered
 * markup never contains `navigator.onLine` (avoids hydration mismatches).
 */
export function GlobalOfflineIndicator() {
  const { isOnline } = useOnlineStatus();
  return <OfflineIndicator isOffline={!isOnline} />;
}
