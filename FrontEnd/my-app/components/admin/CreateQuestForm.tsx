'use client';

import { useState, useCallback } from 'react';
import type { QuestFormData, QuestCategory, QuestDifficulty } from '@/lib/types/admin';
import { validateQuestForm, getFieldError, sanitizeQuestData, type ValidationError } from '@/lib/validation/quest';

interface CreateQuestFormProps {
  onSubmit: (data: QuestFormData) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
  initialData?: Partial<QuestFormData>;
}

const CATEGORIES: QuestCategory[] = ['Development', 'Blockchain', 'Documentation', 'Design', 'Testing', 'Community'];
const DIFFICULTIES: QuestDifficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

const defaultFormData: QuestFormData = {
  title: '',
  description: '',
  shortDescription: '',
  category: 'Development',
  difficulty: 'beginner',
  reward: 100,
  xpReward: 50,
  deadline: '',
  maxParticipants: 10,
  requirements: [''],
  tags: [],
};

export function CreateQuestForm({ onSubmit, isSubmitting, initialData }: CreateQuestFormProps) {
  const [formData, setFormData] = useState<QuestFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    // Clear error for this field when user starts typing
    setErrors(prev => prev.filter(err => err.field !== name));
  }, []);

  const handleRequirementChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => (i === index ? value : req)),
    }));
  }, []);

  const addRequirement = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, ''],
    }));
  }, []);

  const removeRequirement = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  const removeTag = useCallback((tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateQuestForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const sanitizedData = sanitizeQuestData(formData);
    const result = await onSubmit(sanitizedData);

    if (!result.success && result.error) {
      setErrors([{ field: 'submit', message: result.error }]);
    }
  }, [formData, onSubmit]);

  const inputClasses = (field: string) => `
    w-full rounded-lg border px-4 py-2.5 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500
    ${getFieldError(errors, field)
      ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
      : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'}
    text-zinc-900 dark:text-zinc-50
    placeholder:text-zinc-400 dark:placeholder:text-zinc-500
  `;

  const labelClasses = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Submit Error */}
      {getFieldError(errors, 'submit') && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{getFieldError(errors, 'submit')}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className={labelClasses}>
          Quest Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter quest title"
          className={inputClasses('title')}
        />
        {getFieldError(errors, 'title') && (
          <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'title')}</p>
        )}
      </div>

      {/* Short Description */}
      <div>
        <label htmlFor="shortDescription" className={labelClasses}>
          Short Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="shortDescription"
          name="shortDescription"
          value={formData.shortDescription}
          onChange={handleChange}
          placeholder="Brief summary (max 200 characters)"
          maxLength={200}
          className={inputClasses('shortDescription')}
        />
        <div className="mt-1 flex justify-between">
          {getFieldError(errors, 'shortDescription') ? (
            <p className="text-sm text-red-500">{getFieldError(errors, 'shortDescription')}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-zinc-400">{formData.shortDescription.length}/200</span>
        </div>
      </div>

      {/* Full Description (Rich Text) */}
      <div>
        <label htmlFor="description" className={labelClasses}>
          Full Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Detailed quest description. Supports markdown formatting."
          rows={6}
          className={inputClasses('description')}
        />
        {getFieldError(errors, 'description') && (
          <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'description')}</p>
        )}
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Tip: Use markdown for formatting (headers, lists, code blocks)
        </p>
      </div>

      {/* Category and Difficulty */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={labelClasses}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={inputClasses('category')}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {getFieldError(errors, 'category') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'category')}</p>
          )}
        </div>

        <div>
          <label htmlFor="difficulty" className={labelClasses}>
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            id="difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className={inputClasses('difficulty')}
          >
            {DIFFICULTIES.map(diff => (
              <option key={diff} value={diff}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
          {getFieldError(errors, 'difficulty') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'difficulty')}</p>
          )}
        </div>
      </div>

      {/* Rewards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reward" className={labelClasses}>
            Reward (XLM) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="reward"
            name="reward"
            value={formData.reward}
            onChange={handleChange}
            min={0}
            max={10000}
            className={inputClasses('reward')}
          />
          {getFieldError(errors, 'reward') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'reward')}</p>
          )}
        </div>

        <div>
          <label htmlFor="xpReward" className={labelClasses}>
            XP Reward <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="xpReward"
            name="xpReward"
            value={formData.xpReward}
            onChange={handleChange}
            min={0}
            max={5000}
            className={inputClasses('xpReward')}
          />
          {getFieldError(errors, 'xpReward') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'xpReward')}</p>
          )}
        </div>
      </div>

      {/* Deadline and Max Participants */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="deadline" className={labelClasses}>
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="deadline"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className={inputClasses('deadline')}
          />
          {getFieldError(errors, 'deadline') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'deadline')}</p>
          )}
        </div>

        <div>
          <label htmlFor="maxParticipants" className={labelClasses}>
            Max Participants <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="maxParticipants"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
            min={1}
            max={10000}
            className={inputClasses('maxParticipants')}
          />
          {getFieldError(errors, 'maxParticipants') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError(errors, 'maxParticipants')}</p>
          )}
        </div>
      </div>

      {/* Requirements */}
      <div>
        <label className={labelClasses}>Requirements</label>
        <div className="space-y-2">
          {formData.requirements.map((req, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={req}
                onChange={(e) => handleRequirementChange(index, e.target.value)}
                placeholder={`Requirement ${index + 1}`}
                className={inputClasses('requirements')}
              />
              {formData.requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="rounded-lg border border-zinc-200 px-3 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  X
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRequirement}
          className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          + Add Requirement
        </button>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className={labelClasses}>Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-blue-900 dark:hover:text-blue-200"
              >
                x
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          id="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Type a tag and press Enter"
          className={inputClasses('tags')}
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating Quest...' : 'Create Quest'}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
