'use client';

import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getMediaQueryList(): MediaQueryList | null {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

/**
 * Check whether the user prefers reduced motion.
 * Safe to call during server-side rendering (returns false).
 */
export function prefersReducedMotion(): boolean {
  const mql = getMediaQueryList();
  return mql ? mql.matches : false;
}

/**
 * Subscribe to changes in the user's reduced-motion preference.
 * Returns an unsubscribe function. No-op in non-browser environments.
 */
export function onPrefersReducedMotionChange(
  callback: (reduced: boolean) => void
): () => void {
  const mql = getMediaQueryList();
  if (!mql) {
    return () => {};
  }

  const listener = (e: MediaQueryListEvent) => callback(e.matches);

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }

  // Fallback for older browsers that only support addListener.
  mql.addListener(listener);
  return () => mql.removeListener(listener);
}

/**
 * React hook that returns whether the user prefers reduced motion,
 * re-rendering the component when the preference changes.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    return onPrefersReducedMotionChange(setReduced);
  }, []);

  return reduced;
}
