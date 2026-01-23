'use client';

import { use } from 'react';
import { useAdminAccess, useQuest, useNotificationState } from '@/lib/hooks/useAdmin';
import { AdminLayout, QuestEditor, Notifications } from '@/components/admin';
import { NotificationContext } from '@/lib/hooks/useAdmin';
import { updateQuestStatus } from '@/lib/api/admin';
import type { QuestFormData, QuestStatus } from '@/lib/types/admin';

interface EditQuestContentProps {
  questId: string;
}

function EditQuestContent({ questId }: EditQuestContentProps) {
  const { quest, isLoading, error, isSaving, save } = useQuest(questId);
  const notificationState = useNotificationState();

  const handleSave = async (data: Partial<QuestFormData>) => {
    const result = await save(data);

    if (result.success) {
      notificationState.addNotification({
        type: 'success',
        title: 'Quest Updated',
        message: 'Your changes have been saved successfully.',
      });
      return { success: true };
    }

    notificationState.addNotification({
      type: 'error',
      title: 'Update Failed',
      message: result.error || 'Failed to save changes.',
    });
    return { success: false, error: result.error };
  };

  const handleStatusChange = async (status: QuestStatus) => {
    try {
      await updateQuestStatus(questId, status);
      notificationState.addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Quest status changed to ${status}.`,
      });
      // Reload the quest data
      window.location.reload();
      return { success: true };
    } catch (err) {
      notificationState.addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update quest status.',
      });
      return { success: false, error: 'Failed to update status' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-4">
            <div className="h-6 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-32 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <div className="text-4xl mb-3">😕</div>
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Quest Not Found
        </h2>
        <p className="mt-1 text-sm text-red-600 dark:text-red-300">
          {error || 'The requested quest could not be found.'}
        </p>
        <a
          href="/admin"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Back to Admin
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <a href="/admin" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Admin
          </a>
          <span>/</span>
          <a href="/admin" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Quests
          </a>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
            {quest.title}
          </span>
        </nav>

        {/* Editor */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <QuestEditor
            quest={quest}
            onSave={handleSave}
            onStatusChange={handleStatusChange}
            isSaving={isSaving}
          />
        </div>
      </div>
      <Notifications
        notifications={notificationState.notifications}
        onDismiss={notificationState.removeNotification}
      />
    </>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditQuestPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { isAdmin, adminUser, isLoading: accessLoading, error: accessError } = useAdminAccess();
  const notificationState = useNotificationState();

  if (accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Access Denied
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            {accessError || 'You do not have permission to access this page.'}
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <NotificationContext.Provider value={notificationState}>
      <AdminLayout user={adminUser}>
        <EditQuestContent questId={resolvedParams.id} />
      </AdminLayout>
    </NotificationContext.Provider>
  );
}
