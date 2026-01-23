'use client';

import { useRouter } from 'next/navigation';
import { useAdminAccess, useCreateQuest, useNotificationState } from '@/lib/hooks/useAdmin';
import { AdminLayout, CreateQuestForm, Notifications } from '@/components/admin';
import { NotificationContext } from '@/lib/hooks/useAdmin';
import type { QuestFormData } from '@/lib/types/admin';

function NewQuestContent() {
  const router = useRouter();
  const { create, isCreating } = useCreateQuest();
  const notificationState = useNotificationState();

  const handleSubmit = async (data: QuestFormData) => {
    const result = await create(data);

    if (result.success) {
      notificationState.addNotification({
        type: 'success',
        title: 'Quest Created',
        message: `"${data.title}" has been created successfully.`,
      });
      // Redirect to admin dashboard after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 1500);
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            <a href="/admin" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              Admin
            </a>
            <span>/</span>
            <a href="/admin" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              Quests
            </a>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-50">New</span>
          </nav>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Create New Quest
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Fill in the details to create a new quest for contributors
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <CreateQuestForm onSubmit={handleSubmit} isSubmitting={isCreating} />
        </div>
      </div>
      <Notifications
        notifications={notificationState.notifications}
        onDismiss={notificationState.removeNotification}
      />
    </>
  );
}

export default function NewQuestPage() {
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
        <NewQuestContent />
      </AdminLayout>
    </NotificationContext.Provider>
  );
}
