'use client';

import React, { useState } from 'react';
import type { Quest, QuestStatus } from '@/lib/types/admin';
import { useQuestFilters } from './useQuestFilters';
import { QuestFilters } from './QuestFilters';
import { QuestBulkActions } from './QuestBulkActions';
import type { BulkAction } from './QuestBulkActions';
import { QuestTable } from './QuestTable';
import { QuestDeleteDialog } from './QuestDeleteDialog';

export interface QuestManagerProps {
  quests: Quest[];
  isLoading: boolean;
  selectedQuests: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStatusChange: (
    id: string,
    status: QuestStatus
  ) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  onBulkOperation: (action: BulkAction) => Promise<{ success: boolean }>;
  onEdit?: (quest: Quest) => void;
}

export function QuestManager({
  quests,
  isLoading,
  selectedQuests,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDelete,
  onBulkOperation,
  onEdit,
}: QuestManagerProps) {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortOrder,
    handleSort,
    filteredAndSortedQuests,
  } = useQuestFilters(quests);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    await onDelete(confirmDeleteId);
    setIsDeleting(false);
    setConfirmDeleteId(null);
  };

  const allSelected =
    quests.length > 0 && selectedQuests.size === quests.length;

  return (
    <div className="space-y-4">
      <QuestFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showNewQuestLink={!onEdit}
      />

      <QuestBulkActions
        selectedCount={selectedQuests.size}
        onBulkOperation={onBulkOperation}
        onClear={onClearSelection}
      />

      <QuestTable
        quests={filteredAndSortedQuests}
        isLoading={isLoading}
        selectedQuests={selectedQuests}
        sortField={sortField}
        sortOrder={sortOrder}
        allSelected={allSelected}
        onSort={handleSort}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onEdit={onEdit}
        onDelete={setConfirmDeleteId}
      />

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Showing {filteredAndSortedQuests.length} of {quests.length} quests
      </p>

      <QuestDeleteDialog
        questId={confirmDeleteId}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
