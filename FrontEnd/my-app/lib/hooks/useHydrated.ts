'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

/**
 * Returns `true` once Zustand's persist middleware has finished rehydrating
 * from localStorage.  Components that act on persisted wallet state (e.g.
 * wallet reconnection verification) should gate on this value to avoid
 * racing against async rehydration — Zustand v5's persist middleware reads
 * storage asynchronously, so `useStore()` may return defaults on the first
 * render even when localStorage contains real data.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (hydrated) return;

    const unsub = useStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Re-check in case hydration finished between render and effect
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, [hydrated]);

  return hydrated;
}
