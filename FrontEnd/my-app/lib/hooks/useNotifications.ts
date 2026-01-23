"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Notification,
  NotificationSettings,
  DEFAULT_SETTINGS,
} from "../utils/notifications";

const STORAGE_KEY = "stellar_earn_notifications";
const SETTINGS_KEY = "stellar_earn_notification_settings";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }

    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Optional: Play sound if enabled
      if (settings.soundEnabled) {
        const audio = new Audio("/notification-sound.mp3"); // Need to ensure this exists or handle error
        audio.play().catch(() => {
          /* mute error */
        });
      }

      return newNotification;
    },
    [settings.soundEnabled],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<NotificationSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    },
    [],
  );

  return {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
  };
}
