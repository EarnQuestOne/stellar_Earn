import { StateCreator } from 'zustand';
import type {
  Notification,
  NotificationSettings,
} from '@/lib/utils/notifications';

export interface NotificationSlice {
  // state
  notifications: Notification[];
  notificationSettings: NotificationSettings;

  // computed (derived in actions)
  unreadCount: number;

  // actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  questUpdates: true,
  submissionStatus: true,
  rewardClaims: true,
  soundEnabled: true,
};

export const createNotificationSlice: StateCreator<NotificationSlice> = (
  set
) => ({
  notifications: [],
  notificationSettings: DEFAULT_SETTINGS,
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((s) => {
      const updated = [notification, ...s.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((s) => {
      const updated = s.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  clearAllNotifications: () => set({ notifications: [], unreadCount: 0 }),

  updateNotificationSettings: (settings) =>
    set((s) => ({
      notificationSettings: { ...s.notificationSettings, ...settings },
    })),
});
