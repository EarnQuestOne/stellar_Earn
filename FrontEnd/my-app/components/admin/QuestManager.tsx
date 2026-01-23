'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Quest, QuestStatus } from '@/lib/types/admin';

interface QuestManagerProps {
  quests: Quest[];
  isLoading: boolean;
  selectedQuests: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStatusChange: (id: string, status: QuestStatus) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  onBulkOperation: (action: 'activate' | 'pause' | 'complete' | 'cancel' | 'delete') => Promise<{ success: boolean }>;
}

type SortField = 'title' | 'status' | 'reward' | 'deadline' | 'participants';
type SortOrder = 'asc' | 'desc';

const STATUS_COLORS: Record<QuestStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function QuestRowSkeleton() {
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="py-4 pr-3">
        <div className="h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </td>
      <td className="py-4 pr-4">
        <div className="h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </td>
      <td className="py-4 pr-4">
        <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </td>
      <td className="py-4 pr-4">
        <div className="h-5 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </td>
      <td className="py-4 pr-4">
        <div className="h-5 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </td>
      <td className="py-4 pr-4">
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </td>
      <td className="py-4">
        <div className="h-8 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </td>
    </tr>
  );
}

export function QuestManager({
  quests,
  isLoading,
  selectedQuests,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onStatusChange,
  onDelete,
  onBulkOperation,
}: QuestManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const filteredAndSortedQuests = useMemo(() => {
    let result = [...quests];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        q =>
          q.title.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query) ||
          q.category.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'reward':
          comparison = a.reward - b.reward;
          break;
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case 'participants':
          comparison = a.currentParticipants - b.currentParticipants;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [quests, searchQuery, statusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-zinc-300 dark:text-zinc-600">↕</span>;
    return <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const allSelected = quests.length > 0 && selectedQuests.size === quests.length;
  const someSelected = selectedQuests.size > 0;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuestStatus | 'all')}
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

        <Link
          href="/admin/quests/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <span>+</span>
          New Quest
        </Link>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedQuests.size} selected
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
                  onClick={() => { onBulkOperation('activate'); setShowBulkMenu(false); }}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Activate
                </button>
                <button
                  onClick={() => { onBulkOperation('pause'); setShowBulkMenu(false); }}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Pause
                </button>
                <button
                  onClick={() => { onBulkOperation('complete'); setShowBulkMenu(false); }}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Complete
                </button>
                <button
                  onClick={() => { onBulkOperation('cancel'); setShowBulkMenu(false); }}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
                <button
                  onClick={() => { onBulkOperation('delete'); setShowBulkMenu(false); }}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClearSelection}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => (allSelected ? onClearSelection() : onSelectAll())}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                onClick={() => handleSort('title')}
              >
                Title <SortIcon field="title" />
              </th>
              <th
                className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </th>
              <th
                className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                onClick={() => handleSort('reward')}
              >
                Reward <SortIcon field="reward" />
              </th>
              <th
                className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                onClick={() => handleSort('participants')}
              >
                Participants <SortIcon field="participants" />
              </th>
              <th
                className="cursor-pointer py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                onClick={() => handleSort('deadline')}
              >
                Deadline <SortIcon field="deadline" />
              </th>
              <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900">
            {isLoading ? (
              <>
                <QuestRowSkeleton />
                <QuestRowSkeleton />
                <QuestRowSkeleton />
              </>
            ) : filteredAndSortedQuests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No quests found
                </td>
              </tr>
            ) : (
              filteredAndSortedQuests.map(quest => (
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
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[quest.status]}`}>
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
                    {new Date(quest.deadline).toLocaleDateString()}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/quests/${quest.id}/edit`}
                        className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => onDelete(quest.id)}
                        className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Showing {filteredAndSortedQuests.length} of {quests.length} quests
      </p>
    </div>
  );
}
