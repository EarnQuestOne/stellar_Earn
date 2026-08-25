'use client';

import { useEffect, useRef } from 'react';

interface QuestEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  questId: string;
  children?: React.ReactNode;
}

/**
 * Fix #2219: adds focus trapping (Tab/Shift+Tab cycles within modal),
 * `role="dialog"`, `aria-modal`, and `aria-labelledby` to QuestEditModal
 * so it is accessible to keyboard and screen-reader users.
 */
export function QuestEditModal({ isOpen, onClose, questId, children }: QuestEditModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the modal while it is open
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`quest-edit-title-${questId}`}
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
      >
        <h2 id={`quest-edit-title-${questId}`} className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Edit Quest
        </h2>
        <div className="mt-4">{children}</div>
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}