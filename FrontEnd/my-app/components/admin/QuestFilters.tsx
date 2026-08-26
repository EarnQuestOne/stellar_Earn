'use client';

import React from 'react';
import Link from 'next/link';
import type { QuestStatus } from '@/lib/types/admin';

export interface QuestFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: QuestStatus | 'all';
  onStatusFilterChange: (value: QuestStatus | 'all') => void;
  showNewQuestLink?: boolean;
}

export function QuestFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showNewQuestLink = true,
}: QuestFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search quests..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as QuestStatus | 'all')
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {showNewQuestLink && (
        <Link
          href="/admin/quests/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <span>+</span>
          New Quest
        </Link>
      )}
    </div>
  );
}
