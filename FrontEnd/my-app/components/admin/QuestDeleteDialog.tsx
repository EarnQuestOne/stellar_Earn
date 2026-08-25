'use client';

interface QuestDeleteDialogProps {
  isOpen: boolean;
  questTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * Fix #2220: confirmation dialog before destructive quest deletion.
 * Displays the quest title and requires an explicit confirm click
 * before the delete action fires, preventing accidental data loss.
 */
export function QuestDeleteDialog({
  isOpen, questTitle, onConfirm, onCancel, isDeleting = false,
}: QuestDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 id="delete-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Delete Quest?
        </h2>
        <p id="delete-dialog-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This will permanently delete <strong>&quot;{questTitle}&quot;</strong>. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}