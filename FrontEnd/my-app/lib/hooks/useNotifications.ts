'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { Notification } from '@/lib/utils/notifications';

export function useNotifications() {
  const notifications = useStore((s) => s.notifications);
  const unreadCount = useStore((s) => s.unreadCount);
  const settings = useStore((s) => s.notificationSettings);

  const addNotification = useStore((s) => s.addNotification);
  const markAsRead = useStore((s) => s.markAsRead);
  const markAllAsRead = useStore((s) => s.markAllAsRead);
  const removeNotification = useStore((s) => s.removeNotification);
  const clearAll = useStore((s) => s.clearAllNotifications);
  const updateNotificationSettings = useStore(
    (s) => s.updateNotificationSettings
  );

  const add = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        read: false,
      };

      addNotification(newNotification);

      if (settings.soundEnabled) {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(() => {});
      }

      return newNotification;
    },
    [addNotification, settings.soundEnabled]
  );

  return {
    notifications,
    unreadCount,
    settings,
    addNotification: add,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings: updateNotificationSettings,
  };
}
