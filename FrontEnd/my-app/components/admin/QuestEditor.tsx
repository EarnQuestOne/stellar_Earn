'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Quest, QuestFormData, QuestStatus } from '@/lib/types/admin';
import { validateQuestForm, getFieldError, type ValidationError } from '@/lib/validation/quest';

interface QuestEditorProps {
  quest: Quest;
  onSave: (data: Partial<QuestFormData>) => Promise<{ success: boolean; error?: string }>;
  onStatusChange: (status: QuestStatus) => Promise<{ success: boolean; error?: string }>;
  isSaving: boolean;
}

const STATUS_OPTIONS: { value: QuestStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'paused', label: 'Paused', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

export function QuestEditor({ quest, onSave, onStatusChange, isSaving }: QuestEditorProps) {
  const [formData, setFormData] = useState<Partial<QuestFormData>>({
    title: quest.title,
    description: quest.description,
    shortDescription: quest.shortDescription,
    category: quest.category,
    difficulty: quest.difficulty,
    reward: quest.reward,
    xpReward: quest.xpReward,
    deadline: quest.deadline.slice(0, 16), // Format for datetime-local
    maxParticipants: quest.maxParticipants,
    requirements: quest.requirements,
    tags: quest.tags,
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'settings' | 'preview'>('details');

  useEffect(() => {
    // Check for changes
    const changed =
      formData.title !== quest.title ||
      formData.description !== quest.description ||
      formData.shortDescription !== quest.shortDescription ||
      formData.reward !== quest.reward ||
      formData.xpReward !== quest.xpReward;
    setHasChanges(changed);
  }, [formData, quest]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    setErrors(prev => prev.filter(err => err.field !== name));
  }, []);

  const handleSave = useCallback(async () => {
    const validation = validateQuestForm(formData as QuestFormData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const result = await onSave(formData);
    if (result.success) {
      setHasChanges(false);
    } else if (result.error) {
      setErrors([{ field: 'submit', message: result.error }]);
    }
  }, [formData, onSave]);

  const handleStatusChange = useCallback(async (newStatus: QuestStatus) => {
    await onStatusChange(newStatus);
  }, [onStatusChange]);

  const inputClasses = (field: string) => `
    w-full rounded-lg border px-4 py-2.5 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500
    ${getFieldError(errors, field)
      ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
      : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'}
    text-zinc-900 dark:text-zinc-50
  `;

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Edit Quest
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ID: {quest.id} | Created: {new Date(quest.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Status Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
          <select
            value={quest.status}
            onChange={(e) => handleStatusChange(e.target.value as QuestStatus)}
            className={`rounded-lg border-0 px-3 py-1.5 text-sm font-medium ${
              STATUS_OPTIONS.find(s => s.value === quest.status)?.color
            }`}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="flex gap-6">
          {(['details', 'settings', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {getFieldError(errors, 'submit') && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{getFieldError(errors, 'submit')}</p>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={inputClasses('title')}
            />
            {getFieldError(errors, 'title') && (
              <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'title')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Short Description
            </label>
            <input
              type="text"
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleChange}
              maxLength={200}
              className={inputClasses('shortDescription')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Full Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={8}
              className={inputClasses('description')}
            />
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Reward (XLM)
              </label>
              <input
                type="number"
                name="reward"
                value={formData.reward}
                onChange={handleChange}
                min={0}
                className={inputClasses('reward')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                XP Reward
              </label>
              <input
                type="number"
                name="xpReward"
                value={formData.xpReward}
                onChange={handleChange}
                min={0}
                className={inputClasses('xpReward')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Deadline
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className={inputClasses('deadline')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Max Participants
              </label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min={1}
                className={inputClasses('maxParticipants')}
              />
            </div>
          </div>

          {/* Participants Info */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <strong>Current Participants:</strong> {quest.currentParticipants} / {quest.maxParticipants}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {formData.title || 'Untitled Quest'}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {formData.shortDescription || 'No description'}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              STATUS_OPTIONS.find(s => s.value === quest.status)?.color
            }`}>
              {quest.status}
            </span>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{formData.description}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400 font-medium">
              +{formData.reward} XLM
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              +{formData.xpReward} XP
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Due: {formData.deadline ? new Date(formData.deadline).toLocaleDateString() : 'Not set'}
            </span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div>
          {hasChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              You have unsaved changes
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
