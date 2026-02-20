'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  /**
   * Whether the focus trap is active
   */
  active?: boolean;
  /**
   * Callback when focus escapes the trap (e.g., Shift+Tab from first element)
   */
  onEscape?: () => void;
  /**
   * Initial element to focus when trap activates
   */
  initialFocus?: React.RefObject<HTMLElement>;
}

/**
 * FocusTrap component
 * 
 * Traps keyboard focus within a container (e.g., modal, dropdown).
 * Essential for accessibility when modals or dialogs are open.
 */
export function FocusTrap({
  children,
  active = true,
  onEscape,
  initialFocus,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the trap
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return [];

      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(selector)
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          !el.getAttribute('aria-hidden') &&
          el.offsetParent !== null // Visible elements only
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // If Shift+Tab on first element, wrap to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // If Tab on last element, wrap to first
      if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      // If focus is outside trap, move to first element
      if (!containerRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus initial element or first focusable element
    setTimeout(() => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous element when trap deactivates
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, initialFocus]);

  return (
    <div ref={containerRef} style={{ outline: 'none' }} tabIndex={-1}>
      {children}
    </div>
  );
}
