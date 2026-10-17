'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';

interface DeferHydrationProps {
  /** The interactive widget to mount once it is near the viewport. */
  children: ReactNode;
  /** Rendered before the widget mounts. Defaults to a shimmer block. */
  placeholder?: ReactNode;
  /** How early (before entering the viewport) to start mounting. */
  rootMargin?: string;
  /** Reserved height for the placeholder to limit layout shift. */
  minHeight?: number | string;
  className?: string;
}

/**
 * Defers mounting (and therefore hydration) of a below-the-fold interactive
 * widget until it scrolls near the viewport. The server and first client render
 * both show the placeholder, avoiding a hydration mismatch; the real children
 * mount on the client only once visible — reducing the up-front hydration and
 * JavaScript execution cost of the initial page.
 */
export function DeferHydration({
  children,
  placeholder,
  rootMargin = '200px',
  minHeight = 120,
  className,
}: DeferHydrationProps) {
  const [setRef, entry] = useIntersectionObserver({
    rootMargin,
    freezeOnceVisible: true,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When IntersectionObserver is unavailable (older browsers / no-JS crawlers
  // that still execute effects), fall back to rendering the children so content
  // is never permanently hidden.
  const intersectionUnsupported =
    typeof window !== 'undefined' &&
    typeof window.IntersectionObserver === 'undefined';

  const visible =
    mounted && (intersectionUnsupported || Boolean(entry?.isIntersecting));

  const fallback = placeholder ?? (
    <div
      className="animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
      style={{ minHeight }}
      aria-hidden="true"
    />
  );

  return (
    <div ref={setRef} className={className}>
      {visible ? children : fallback}
    </div>
  );
}

export default DeferHydration;
