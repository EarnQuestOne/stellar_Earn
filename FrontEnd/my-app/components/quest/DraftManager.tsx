'use client';

interface DraftManagerProps {
  hasDraft: boolean;
  lastSavedAt: string | null;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
}

const DraftManager = ({
  hasDraft,
  lastSavedAt,
  onSave,
  onLoad,
  onClear,
}: DraftManagerProps) => {
  const formatted = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not yet saved';

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Draft Manager
      </p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
        Last save: {formatted}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onLoad}
          disabled={!hasDraft}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Load Draft
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasDraft}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Clear Draft
        </button>
      </div>
    </div>
  );
};

export default DraftManager;
