/**
 * Notifications API.
 *
 * The backend notifications module currently has a stub controller.
 * These functions target the expected REST endpoints so they'll work
 * transparently once the backend is implemented. In the meantime, each
 * function falls back gracefully to local state (managed by `useNotifications`).
 *
 * Endpoints (all under /api/v1/notifications):
 *  GET    /              – list notifications (paginated, filterable)
 *  PATCH  /:id/read      – mark a single notification as read
 *  PATCH  /read-all      – mark all notifications as read
 *  DELETE /:id           – delete a notification
 *  DELETE /              – clear all notifications
 */

import {
  get,
  patch,
  del,
  withRetry,
  createCancelToken,
  type CancelToken,
} from './client';
import type {
  NotificationResponse,
  NotificationsListResponse,
  NotificationQueryParams,
} from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// List notifications
// ---------------------------------------------------------------------------

/**
 * Fetch paginated notifications for the authenticated user.
 * Falls back to an empty list when the backend endpoint is not yet live (404/501).
 */
export async function getNotifications(
  query?: NotificationQueryParams,
  cancelToken?: CancelToken,
): Promise<NotificationsListResponse> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query?.page) params.page = query.page;
  if (query?.limit) params.limit = query.limit;
  if (query?.read !== undefined) params.read = query.read;
  if (query?.category) params.category = query.category;

  try {
    return await withRetry(() =>
      get<NotificationsListResponse>('/notifications', {
        params,
        signal: cancelToken?.signal,
      }),
    );
  } catch (err: unknown) {
    // Backend stub not yet implemented – return empty list
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 501) {
      return { notifications: [], total: 0, unreadCount: 0 };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  id: string,
): Promise<NotificationResponse> {
  return patch<NotificationResponse>(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read for the authenticated user.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await patch<void>('/notifications/read-all');
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Delete a single notification by ID.
 */
export async function deleteNotification(id: string): Promise<void> {
  await del<void>(`/notifications/${id}`);
}

/**
 * Clear all notifications for the authenticated user.
 */
export async function clearAllNotifications(): Promise<void> {
  await del<void>('/notifications');
}
