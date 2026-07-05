'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Quest, QuestFormData } from '@/lib/types/admin';
import { QuestForm } from './QuestForm';

interface QuestEditModalProps {
  quest: Quest | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    data: Partial<QuestFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  onArchive: (id: string) => Promise<{ success: boolean; error?: string }>;
  isSaving: boolean;
}

export function QuestEditModal({
  quest,
  isOpen,
  onClose,
  onSave,
  onArchive,
  isSaving,
}: QuestEditModalProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!isOpen) setShowArchiveConfirm(false);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSave = useCallback(
    async (data: QuestFormData) => {
      if (!quest) return { success: false, error: 'No quest selected' };
      const result = await onSave(quest.id, data);
      if (result.success) onClose();
      return result;
    },
    [quest, onSave, onClose]
  );

  const handleArchiveConfirm = useCallback(async () => {
    if (!quest) return;
    setIsArchiving(true);
    const result = await onArchive(quest.id);
    setIsArchiving(false);
    if (result.success) {
      setShowArchiveConfirm(false);
      onClose();
    }
  }, [quest, onArchive, onClose]);

  if (!isOpen || !quest) return null;

  const initialData: Partial<QuestFormData> = {
    title: quest.title,
    description: quest.description,
    shortDescription: quest.shortDescription,
    category: quest.category,
    difficulty: quest.difficulty,
    reward: quest.reward,
    xpReward: quest.xpReward,
    deadline: quest.deadline ? quest.deadline.slice(0, 16) : '',
    maxParticipants: quest.maxParticipants,
    requirements: quest.requirements.length > 0 ? quest.requirements : [''],
    tags: quest.tags,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-edit-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <div>
              <h2
                id="quest-edit-modal-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Edit Quest
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ID: {quest.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {quest.status !== 'cancelled' && (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                >
                  Archive
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Close modal"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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

          {/* Archive Confirmation Banner */}
          {showArchiveConfirm && (
            <div className="mx-6 mt-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Archive this quest?
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                This will cancel the quest. Participants will no longer be able
                to submit.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleArchiveConfirm}
                  disabled={isArchiving}
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {isArchiving ? 'Archiving...' : 'Yes, Archive'}
                </button>
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="rounded-lg border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-700 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Form Body */}
          <div className="overflow-y-auto p-6">
            <QuestForm
              mode="edit"
              initialData={initialData}
              onSubmit={handleSave}
              onCancel={onClose}
              isSubmitting={isSaving}
            />
          </div>
        </div>
      </div>
    </>
  );
}
