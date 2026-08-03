'use client';

import React, { useState } from 'react';

export type BulkAction = 'activate' | 'pause' | 'complete' | 'cancel' | 'delete';

export interface QuestBulkActionsProps {
  selectedCount: number;
  onBulkOperation: (action: BulkAction) => Promise<{ success: boolean }>;
  onClear: () => void;
}

export function QuestBulkActions({
  selectedCount,
  onBulkOperation,
  onClear,
}: QuestBulkActionsProps) {
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
        {selectedCount} selected
      </span>
      <div className="relative">
        <button
          onClick={() => setShowBulkMenu(!showBulkMenu)}
          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-600 dark:bg-blue-900/50 dark:text-blue-300"
        >
          Bulk Actions
        </button>
        {showBulkMenu && (
          <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => {
                onBulkOperation('activate');
                setShowBulkMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Activate
            </button>
            <button
              onClick={() => {
                onBulkOperation('pause');
                setShowBulkMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Pause
            </button>
            <button
              onClick={() => {
                onBulkOperation('complete');
                setShowBulkMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Complete
            </button>
            <button
              onClick={() => {
                onBulkOperation('cancel');
                setShowBulkMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
            <button
              onClick={() => {
                onBulkOperation('delete');
                setShowBulkMenu(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onClear}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Clear
      </button>
    </div>
  );
}
