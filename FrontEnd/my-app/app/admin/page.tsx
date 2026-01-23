'use client';

import { useAdminAccess, useAdminStats, useQuestManagement, useNotificationState } from '@/lib/hooks/useAdmin';
import { AdminLayout, AdminStats, QuestManager, Notifications } from '@/components/admin';
import { NotificationContext } from '@/lib/hooks/useAdmin';

function AdminDashboardContent() {
  const { stats, isLoading: statsLoading } = useAdminStats();
  const {
    quests,
    isLoading: questsLoading,
    selectedQuests,
    toggleQuestSelection,
    selectAll,
    clearSelection,
    handleStatusChange,
    handleDelete,
    handleBulkOperation,
  } = useQuestManagement();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage quests, review submissions, and track platform performance
        </p>
      </div>

      {/* Stats Section */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Platform Overview
        </h2>
        <AdminStats stats={stats} isLoading={statsLoading} />
      </section>

      {/* Quest Manager Section */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Quest Management
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <QuestManager
            quests={quests}
            isLoading={questsLoading}
            selectedQuests={selectedQuests}
            onToggleSelect={toggleQuestSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onBulkOperation={handleBulkOperation}
          />
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin, adminUser, isLoading: accessLoading, error: accessError } = useAdminAccess();
  const notificationState = useNotificationState();

  // Loading state
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

  // Access denied
  if (!isAdmin || accessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Access Denied
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            {accessError || 'You do not have permission to access the admin panel.'}
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
        <AdminDashboardContent />
      </AdminLayout>
      <Notifications
        notifications={notificationState.notifications}
        onDismiss={notificationState.removeNotification}
      />
    </NotificationContext.Provider>
  );
}
