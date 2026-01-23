'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Quest, AdminStats, AdminUser, QuestFormData, QuestStatus, BulkOperation, Notification } from '../types/admin';
import {
  fetchAdminUser,
  checkAdminAccess,
  fetchAdminStats,
  fetchQuests,
  fetchQuestById,
  createQuest,
  updateQuest,
  updateQuestStatus,
  deleteQuest,
  executeBulkOperation,
} from '../api/admin';

// Notification Context
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Custom hook for notification management
export function useNotificationState() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = String(Date.now());
    const newNotification: Notification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration (default 5 seconds)
    const duration = notification.duration || 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, addNotification, removeNotification };
}

// Admin access hook
export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const hasAccess = await checkAdminAccess();
        setIsAdmin(hasAccess);
        if (hasAccess) {
          const user = await fetchAdminUser();
          setAdminUser(user);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify admin access');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkAccess();
  }, []);

  return { isAdmin, adminUser, isLoading, error };
}

// Admin stats hook
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}

// Quest management hook
export function useQuestManagement() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());

  const loadQuests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchQuests();
      setQuests(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const toggleQuestSelection = useCallback((id: string) => {
    setSelectedQuests(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedQuests(new Set(quests.map(q => q.id)));
  }, [quests]);

  const clearSelection = useCallback(() => {
    setSelectedQuests(new Set());
  }, []);

  const handleStatusChange = useCallback(async (id: string, status: QuestStatus) => {
    try {
      const updated = await updateQuestStatus(id, status);
      setQuests(prev => prev.map(q => (q.id === id ? updated : q)));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update status' };
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteQuest(id);
      setQuests(prev => prev.filter(q => q.id !== id));
      setSelectedQuests(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete quest' };
    }
  }, []);

  const handleBulkOperation = useCallback(async (action: BulkOperation['action']) => {
    if (selectedQuests.size === 0) {
      return { success: false, error: 'No quests selected' };
    }

    try {
      const result = await executeBulkOperation({
        action,
        questIds: Array.from(selectedQuests),
      });
      await loadQuests();
      clearSelection();
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Bulk operation failed' };
    }
  }, [selectedQuests, loadQuests, clearSelection]);

  return {
    quests,
    isLoading,
    error,
    selectedQuests,
    toggleQuestSelection,
    selectAll,
    clearSelection,
    handleStatusChange,
    handleDelete,
    handleBulkOperation,
    refetch: loadQuests,
  };
}

// Single quest hook for editing
export function useQuest(id: string | null) {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const questId = id; // Capture for async function
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchQuestById(questId);
        setQuest(data);
        setError(data ? null : 'Quest not found');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quest');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const save = useCallback(async (data: Partial<QuestFormData>) => {
    if (!id) return { success: false, error: 'No quest ID' };

    setIsSaving(true);
    try {
      const updated = await updateQuest(id, data);
      setQuest(updated);
      return { success: true, quest: updated };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save quest' };
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  return { quest, isLoading, error, isSaving, save };
}

// Quest creation hook
export function useCreateQuest() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: QuestFormData) => {
    setIsCreating(true);
    setError(null);
    try {
      const quest = await createQuest(data);
      return { success: true, quest };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create quest';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating, error };
}
