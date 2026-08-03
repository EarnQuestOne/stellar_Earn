'use client';

import React from 'react';
import type { Quest, QuestStatus } from '@/lib/types/admin';
import type { SortField, SortOrder } from './useQuestFilters';
import { QuestRowActions } from './QuestRowActions';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS_COLORS: Record<QuestStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  active:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface SortIconProps {
  field: SortField;
  currentField: SortField;
  order: SortOrder;
}

function SortIcon({ field, currentField, order }: SortIconProps) {
  if (currentField !== field)
    return <span className="text-zinc-300 dark:text-zinc-600">↕</span>;
  return <span>{order === 'asc' ? '↑' : '↓'}</span>;
}

export interface QuestTableProps {
  quests: Quest[];
  isLoading: boolean;
  selectedQuests: Set<string>;
  sortField: SortField;
  sortOrder: SortOrder;
  allSelected: boolean;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEdit?: (quest: Quest) => void;
  onDelete: (id: string) => void;
}

export function QuestTable({
  quests,
  isLoading,
  selectedQuests,
  sortField,
  sortOrder,
  allSelected,
  onSort,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onEdit,
  onDelete,
}: QuestTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            <th className="py-3 pl-4 pr-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  allSelected ? onClearSelection() : onSelectAll()
                }
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th
              className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              onClick={() => onSort('title')}
            >
              Title <SortIcon field="title" currentField={sortField} order={sortOrder} />
            </th>
            <th
              className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              onClick={() => onSort('status')}
            >
              Status <SortIcon field="status" currentField={sortField} order={sortOrder} />
            </th>
            <th
              className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              onClick={() => onSort('reward')}
            >
              Reward <SortIcon field="reward" currentField={sortField} order={sortOrder} />
            </th>
            <th
              className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              onClick={() => onSort('participants')}
            >
              Participants <SortIcon field="participants" currentField={sortField} order={sortOrder} />
            </th>
            <th
              className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              onClick={() => onSort('deadline')}
            >
              Deadline <SortIcon field="deadline" currentField={sortField} order={sortOrder} />
            </th>
            <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900">
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <tr
                  key={index}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-4 pr-3">
                    <Skeleton.Text className="h-5 w-5" />
                  </td>
                  <td className="py-4 pr-4">
                    <Skeleton.Text className="h-5 w-48" />
                  </td>
                  <td className="py-4 pr-4">
                    <Skeleton.Text className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="py-4 pr-4">
                    <Skeleton.Text className="h-5 w-20" />
                  </td>
                  <td className="py-4 pr-4">
                    <Skeleton.Text className="h-5 w-16" />
                  </td>
                  <td className="py-4 pr-4">
                    <Skeleton.Text className="h-5 w-24" />
                  </td>
                  <td className="py-4">
                    <Skeleton.Text className="h-8 w-20" />
                  </td>
                </tr>
              ))}
            </>
          ) : quests.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="py-8 text-center text-zinc-500 dark:text-zinc-400"
              >
                No quests found
              </td>
            </tr>
          ) : (
            quests.map((quest) => (
              <tr
                key={quest.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <td className="py-4 pl-4 pr-3">
                  <input
                    type="checkbox"
                    checked={selectedQuests.has(quest.id)}
                    onChange={() => onToggleSelect(quest.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="py-4 pr-4">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-xs">
                      {quest.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {quest.category}
                    </p>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[quest.status]}`}
                  >
                    {quest.status}
                  </span>
                </td>
                <td className="py-4 pr-4 text-sm text-zinc-900 dark:text-zinc-50">
                  {quest.reward} XLM
                </td>
                <td className="py-4 pr-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {quest.currentParticipants}/{quest.maxParticipants}
                </td>
                <td className="py-4 pr-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {quest.deadline
                    ? new Date(quest.deadline).toLocaleDateString()
                    : 'No deadline'}
                </td>
                <td className="py-4 pr-4">
                  <QuestRowActions quest={quest} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
