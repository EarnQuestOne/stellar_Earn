'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  useAdminAccess,
  useQuestManagement,
  useNotificationState,
} from '@/lib/hooks/useAdmin';
import {
  AdminLayout,
  QuestManager,
  QuestEditModal,
  Notifications,
} from '@/components/admin';
import { NotificationContext } from '@/lib/hooks/useAdmin';
import { updateQuestStatus, updateQuest } from '@/lib/api/admin';
import type { Quest, QuestFormData } from '@/lib/types/admin';

function QuestsPageContent() {
  const {
    quests,
    isLoading,
    selectedQuests,
    toggleQuestSelection,
    selectAll,
    clearSelection,
    handleStatusChange,
    handleDelete,
    handleBulkOperation,
    refetch,
  } = useQuestManagement();

  const notificationState = useNotificationState();
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = useCallback((quest: Quest) => {
    setEditingQuest(quest);
  }, []);

  const handleSaveQuest = useCallback(
    async (id: string, data: Partial<QuestFormData>) => {
      setIsSaving(true);
      try {
        await updateQuest(id, data);
        notificationState.addNotification({
          type: 'success',
          title: 'Quest Updated',
          message: 'Quest has been updated successfully.',
        });
        await refetch();
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update quest';
        notificationState.addNotification({
          type: 'error',
          title: 'Update Failed',
          message,
        });
        return { success: false, error: message };
      } finally {
        setIsSaving(false);
      }
    },
    [notificationState, refetch]
  );

  const handleArchiveQuest = useCallback(
    async (id: string) => {
      try {
        await updateQuestStatus(id, 'cancelled');
        notificationState.addNotification({
          type: 'success',
          title: 'Quest Archived',
          message: 'The quest has been archived.',
        });
        await refetch();
        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to archive quest';
        notificationState.addNotification({
          type: 'error',
          title: 'Archive Failed',
          message,
        });
        return { success: false, error: message };
      }
    },
    [notificationState, refetch]
  );

  const handleDeleteWithNotification = useCallback(
    async (id: string) => {
      const result = await handleDelete(id);
      if (result.success) {
        notificationState.addNotification({
          type: 'success',
          title: 'Quest Deleted',
          message: 'The quest has been permanently deleted.',
        });
      } else {
        notificationState.addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: result.error || 'Failed to delete quest.',
        });
      }
      return result;
    },
    [handleDelete, notificationState]
  );

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Link
                href="/admin"
                className="hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Admin
              </Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-50">Quests</span>
            </nav>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Quest Management
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create, edit, and manage quests for contributors
            </p>
          </div>
          <Link
            href="/admin/quests/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <span aria-hidden="true">+</span>
            New Quest
          </Link>
        </div>

        {/* Quest List */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <QuestManager
            quests={quests}
            isLoading={isLoading}
            selectedQuests={selectedQuests}
            onToggleSelect={toggleQuestSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteWithNotification}
            onBulkOperation={handleBulkOperation}
            onEdit={handleEdit}
          />
        </div>
      </div>

      <QuestEditModal
        quest={editingQuest}
        isOpen={!!editingQuest}
        onClose={() => setEditingQuest(null)}
        onSave={handleSaveQuest}
        onArchive={handleArchiveQuest}
        isSaving={isSaving}
      />

      <Notifications
        notifications={notificationState.notifications}
        onDismiss={notificationState.removeNotification}
      />
    </>
  );
}

export default function AdminQuestsPage() {
  const {
    isAdmin,
    adminUser,
    isLoading: accessLoading,
    error: accessError,
  } = useAdminAccess();
  const notificationState = useNotificationState();

  if (accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin || accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Access Denied
          </h1>
          <p className="mb-6 text-zinc-500 dark:text-zinc-400">
            {accessError || 'You do not have permission to access this page.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NotificationContext.Provider value={notificationState}>
      <AdminLayout user={adminUser}>
        <QuestsPageContent />
      </AdminLayout>
    </NotificationContext.Provider>
  );
}
