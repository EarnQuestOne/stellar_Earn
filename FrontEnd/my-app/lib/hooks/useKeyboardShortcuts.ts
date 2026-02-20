'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  /**
   * Key combination (e.g., 'k', 'ctrl+k', 'shift+/')
   */
  key: string;
  /**
   * Handler function
   */
  handler: (e: KeyboardEvent) => void;
  /**
   * Description for the shortcuts panel
   */
  description?: string;
  /**
   * Whether the shortcut is enabled
   */
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /**
   * Whether shortcuts are enabled
   */
  enabled?: boolean;
  /**
   * Target element to attach listeners to (defaults to document)
   */
  target?: HTMLElement | null;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     handler: () => openSearch(),
 *     description: 'Open search',
 *   },
 *   {
 *     key: 'ctrl+k',
 *     handler: () => openCommandPalette(),
 *     description: 'Open command palette',
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, target } = options;

  const parseKey = useCallback((key: string): {
    key: string;
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  } => {
    const parts = key.toLowerCase().split('+');
    return {
      key: parts[parts.length - 1].trim(),
      ctrl: parts.includes('ctrl') || parts.includes('control'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      meta: parts.includes('meta') || parts.includes('cmd'),
    };
  }, []);

  const matches = useCallback(
    (e: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
      const parsed = parseKey(shortcut.key);
      return (
        e.key.toLowerCase() === parsed.key &&
        e.ctrlKey === parsed.ctrl &&
        e.shiftKey === parsed.shift &&
        e.altKey === parsed.alt &&
        e.metaKey === parsed.meta
      );
    },
    [parseKey]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'
      ) {
        // Allow shortcuts with modifiers (e.g., Ctrl+K) even in inputs
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled !== false && matches(e, shortcut)) {
          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    const element = target || document;
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled, target, matches]);
}

/**
 * Hook for a single keyboard shortcut
 */
export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: UseKeyboardShortcutsOptions = {}
) {
  useKeyboardShortcuts([{ key, handler }], options);
}
