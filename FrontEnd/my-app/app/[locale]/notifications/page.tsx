'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useFormatter } from '@/lib/hooks/useFormatter';
import type { Notification } from '@/lib/utils/notifications';
import Link from 'next/link';

const PAGE_SIZE = 10;

const TYPE_STYLES: Record<Notification['type'], string> = {
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  success:
    'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  warning:
    'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();
  const { date } = useFormatter();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const paged = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-medium text-primary hover:text-primary-text-hover transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              No notifications yet
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {"We'll notify you when something important happens."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {paged.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 transition-colors ${
                    !n.read
                      ? 'bg-blue-50/40 dark:bg-blue-900/10'
                      : 'bg-white dark:bg-zinc-900/50'
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[n.type]}`}
                  >
                    {n.type}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {n.title}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {date(n.timestamp, 'medium')}
                      </span>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs text-primary hover:text-primary-text-hover transition-colors whitespace-nowrap"
                        aria-label="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => removeNotification(n.id)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                      aria-label="Dismiss notification"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span className="text-zinc-500 dark:text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
