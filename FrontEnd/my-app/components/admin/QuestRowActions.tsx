'use client';

import React from 'react';
import Link from 'next/link';
import type { Quest } from '@/lib/types/admin';

export interface QuestRowActionsProps {
  quest: Quest;
  onEdit?: (quest: Quest) => void;
  onDelete: (id: string) => void;
}

export function QuestRowActions({ quest, onEdit, onDelete }: QuestRowActionsProps) {
  return (
    <div className="flex gap-2">
      {onEdit ? (
        <button
          onClick={() => onEdit(quest)}
          className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          Edit
        </button>
      ) : (
        <Link
          href={`/admin/quests/${quest.id}/edit`}
          className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          Edit
        </Link>
      )}
      <button
        onClick={() => onDelete(quest.id)}
        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        Delete
      </button>
    </div>
  );
}
