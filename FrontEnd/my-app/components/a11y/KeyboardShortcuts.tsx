'use client';

import { useState, useEffect } from 'react';
import { KeyboardShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { formatKeyboardShortcut } from '@/lib/utils/a11y';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsProps {
  /**
   * List of keyboard shortcuts to display
   */
  shortcuts: KeyboardShortcut[];
  /**
   * Whether the panel is open by default
   */
  defaultOpen?: boolean;
  /**
   * Custom trigger key to open/close the panel
   * @default 'shift+/'
   */
  triggerKey?: string;
}

/**
 * KeyboardShortcuts component
 * 
 * Displays a panel showing available keyboard shortcuts.
 * Can be toggled with Shift+/ by default.
 */
export function KeyboardShortcuts({
  shortcuts,
  defaultOpen = false,
  triggerKey = 'shift+/',
}: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Toggle panel with keyboard shortcut
  useKeyboardShortcut(triggerKey, () => {
    setIsOpen((prev) => !prev);
  });

  // Close on Escape
  useKeyboardShortcut('escape', () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-keyboard-shortcuts-panel]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Group shortcuts by category or keep flat
  const groupedShortcuts = shortcuts.filter((s) => s.description);

  return (
    <div
      data-keyboard-shortcuts-panel
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-zinc-900 animate-modal-entrance"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2
            id="keyboard-shortcuts-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            aria-label="Close keyboard shortcuts panel"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {groupedShortcuts.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No keyboard shortcuts available.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedShortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-zinc-100 py-3 last:border-b-0 dark:border-zinc-800"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {shortcut.description || 'Shortcut'}
                  </span>
                  <kbd className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-mono text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {formatKeyboardShortcut(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Press <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * KeyboardShortcutsButton component
 * 
 * A button that opens the keyboard shortcuts panel.
 */
export function KeyboardShortcutsButton({
  shortcuts,
  triggerKey = 'shift+/',
  className = '',
}: {
  shortcuts: KeyboardShortcut[];
  triggerKey?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcut(triggerKey, () => {
    setIsOpen((prev) => !prev);
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:text-zinc-300 dark:hover:bg-zinc-800 ${className}`}
        aria-label="Show keyboard shortcuts"
        aria-haspopup="dialog"
      >
        <span className="sr-only">Keyboard shortcuts</span>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </button>
      {isOpen && (
        <KeyboardShortcuts
          shortcuts={shortcuts}
          defaultOpen={true}
          triggerKey={triggerKey}
        />
      )}
    </>
  );
}
