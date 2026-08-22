'use client';

import React from 'react';

export interface QuestDeleteDialogProps {
  questId: string | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function QuestDeleteDialog({
  questId,
  isDeleting,
  onConfirm,
  onCancel,
}: QuestDeleteDialogProps) {
  if (!questId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="delete-confirm-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Delete Quest
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This action cannot be undone. The quest and all its data will be
          permanently removed.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  );
}
