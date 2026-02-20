'use client';

import { ReactNode } from 'react';

interface ScreenReaderOnlyProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

/**
 * ScreenReaderOnly component
 * 
 * Hides content visually but keeps it accessible to screen readers.
 * Useful for adding context or labels that are only needed for assistive technologies.
 */
export function ScreenReaderOnly({
  children,
  as: Component = 'span',
  className = '',
}: ScreenReaderOnlyProps) {
  return (
    <Component
      className={`sr-only ${className}`}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {children}
    </Component>
  );
}
