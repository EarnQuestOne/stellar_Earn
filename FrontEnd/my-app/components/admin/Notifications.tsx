'use client';

import type { Notification } from '@/lib/types/admin';

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const typeStyles: Record<Notification['type'], { bg: string; icon: string; iconBg: string }> = {
  success: {
    bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    icon: '✓',
    iconBg: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  },
  error: {
    bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    icon: '✗',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    icon: '⚠',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'ℹ',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  },
};

export function Notifications({ notifications, onDismiss }: NotificationsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => {
        const styles = typeStyles[notification.type];
        return (
          <div
            key={notification.id}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right ${styles.bg}`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${styles.iconBg}`}>
              {styles.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {notification.title}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
