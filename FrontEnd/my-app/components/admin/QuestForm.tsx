'use client';

import { useState, useCallback } from 'react';
import { z } from 'zod';
import type {
  QuestFormData,
  QuestCategory,
  QuestDifficulty,
} from '@/lib/types/admin';

const questSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  shortDescription: z
    .string()
    .min(1, 'Short description is required')
    .max(200, 'Short description must be less than 200 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum([
    'Development',
    'Blockchain',
    'Documentation',
    'Design',
    'Testing',
    'Community',
  ]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  reward: z
    .number()
    .min(0, 'Reward cannot be negative')
    .max(10000, 'Reward cannot exceed 10,000 XLM'),
  xpReward: z
    .number()
    .min(0, 'XP reward cannot be negative')
    .max(5000, 'XP reward cannot exceed 5,000'),
  deadline: z
    .string()
    .min(1, 'Deadline is required')
    .refine(
      (val) => new Date(val) > new Date(),
      'Deadline must be in the future'
    ),
  maxParticipants: z
    .number()
    .min(1, 'Must allow at least 1 participant')
    .max(10000, 'Cannot exceed 10,000 participants'),
  requirements: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const CATEGORIES: QuestCategory[] = [
  'Development',
  'Blockchain',
  'Documentation',
  'Design',
  'Testing',
  'Community',
];
const DIFFICULTIES: QuestDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

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

interface QuestFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<QuestFormData>;
  onSubmit: (
    data: QuestFormData
  ) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  isSubmitting: boolean;
}

export function QuestForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: QuestFormProps) {
  const [formData, setFormData] = useState<QuestFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value, type } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
    []
  );

  const handleRequirementChange = useCallback(
    (index: number, value: string) => {
      setFormData((prev) => ({
        ...prev,
        requirements: prev.requirements.map((r, i) =>
          i === index ? value : r
        ),
      }));
    },
    []
  );

  const addRequirement = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ''],
    }));
  }, []);

  const removeRequirement = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const newTag = tagInput.trim().toLowerCase();
        if (!formData.tags.includes(newTag)) {
          setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag] }));
        }
        setTagInput('');
      }
    },
    [tagInput, formData.tags]
  );

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setFieldErrors({});

      const cleanedData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        requirements: formData.requirements
          .map((r) => r.trim())
          .filter((r) => r.length > 0),
        tags: formData.tags
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0),
      };

      const result = questSchema.safeParse(cleanedData);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const field = String(issue.path[0] ?? 'submit');
          if (!errors[field]) errors[field] = issue.message;
        });
        setFieldErrors(errors);
        return;
      }

      const submitResult = await onSubmit(cleanedData);
      if (!submitResult.success && submitResult.error) {
        setSubmitError(submitResult.error);
      }
    },
    [formData, onSubmit]
  );

  const inputClasses = (field: string) =>
    `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      fieldErrors[field]
        ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
        : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
    } text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500`;

  const labelClasses =
    'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="qf-title" className={labelClasses}>
          Quest Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="qf-title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter quest title"
          className={inputClasses('title')}
        />
        {fieldErrors.title && (
          <p className="mt-1 text-sm text-red-500">{fieldErrors.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="qf-shortDescription" className={labelClasses}>
          Short Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="qf-shortDescription"
          name="shortDescription"
          value={formData.shortDescription}
          onChange={handleChange}
          placeholder="Brief summary (max 200 characters)"
          maxLength={200}
          className={inputClasses('shortDescription')}
        />
        <div className="mt-1 flex justify-between">
          {fieldErrors.shortDescription ? (
            <p className="text-sm text-red-500">
              {fieldErrors.shortDescription}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-zinc-400">
            {formData.shortDescription.length}/200
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="qf-description" className={labelClasses}>
          Full Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="qf-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Detailed quest description. Supports markdown formatting."
          rows={5}
          className={inputClasses('description')}
        />
        {fieldErrors.description && (
          <p className="mt-1 text-sm text-red-500">{fieldErrors.description}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="qf-category" className={labelClasses}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="qf-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={inputClasses('category')}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.category}</p>
          )}
        </div>
        <div>
          <label htmlFor="qf-difficulty" className={labelClasses}>
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            id="qf-difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className={inputClasses('difficulty')}
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
          {fieldErrors.difficulty && (
            <p className="mt-1 text-sm text-red-500">
              {fieldErrors.difficulty}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="qf-reward" className={labelClasses}>
            Reward (XLM) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="qf-reward"
            name="reward"
            value={formData.reward}
            onChange={handleChange}
            min={0}
            max={10000}
            className={inputClasses('reward')}
          />
          {fieldErrors.reward && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.reward}</p>
          )}
        </div>
        <div>
          <label htmlFor="qf-xpReward" className={labelClasses}>
            XP Reward <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="qf-xpReward"
            name="xpReward"
            value={formData.xpReward}
            onChange={handleChange}
            min={0}
            max={5000}
            className={inputClasses('xpReward')}
          />
          {fieldErrors.xpReward && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.xpReward}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="qf-deadline" className={labelClasses}>
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="qf-deadline"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className={inputClasses('deadline')}
          />
          {fieldErrors.deadline && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.deadline}</p>
          )}
        </div>
        <div>
          <label htmlFor="qf-maxParticipants" className={labelClasses}>
            Max Participants <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="qf-maxParticipants"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
            min={1}
            max={10000}
            className={inputClasses('maxParticipants')}
          />
          {fieldErrors.maxParticipants && (
            <p className="mt-1 text-sm text-red-500">
              {fieldErrors.maxParticipants}
            </p>
          )}
        </div>
      </div>

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
                  aria-label="Remove requirement"
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

      <div>
        <label htmlFor="qf-tags" className={labelClasses}>
          Tags
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-blue-900 dark:hover:text-blue-200"
                aria-label={`Remove tag: ${tag}`}
              >
                <span aria-hidden="true">x</span>
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          id="qf-tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Type a tag and press Enter"
          className={inputClasses('tags')}
        />
      </div>

      <div className="flex gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Create Quest'
              : 'Save Changes'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
