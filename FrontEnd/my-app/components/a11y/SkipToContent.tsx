'use client';

import { useEffect, useRef } from 'react';

interface SkipToContentProps {
  /**
   * The ID of the main content element to skip to
   * @default 'main-content'
   */
  targetId?: string;
  /**
   * Custom label for the skip link
   * @default 'Skip to main content'
   */
  label?: string;
}

/**
 * SkipToContent component
 * 
 * Provides a keyboard-accessible link to skip navigation and jump directly to main content.
 * This is especially helpful for keyboard and screen reader users.
 */
export function SkipToContent({
  targetId = 'main-content',
  label = 'Skip to main content',
}: SkipToContentProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show skip link when Tab is pressed (keyboard navigation)
      if (e.key === 'Tab' && linkRef.current) {
        linkRef.current.style.display = 'block';
      }
    };

    const handleClick = () => {
      // Hide skip link after clicking
      if (linkRef.current) {
        setTimeout(() => {
          if (linkRef.current) {
            linkRef.current.style.display = 'none';
          }
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    linkRef.current?.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      linkRef.current?.removeEventListener('click', handleClick);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Make it focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
    }
  };

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-[#089ec3] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
      aria-label={label}
    >
      {label}
    </a>
  );
}
