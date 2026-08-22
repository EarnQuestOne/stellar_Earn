'use client';

import { useState } from 'react';
import {
  QUEST_DIFFICULTIES,
  type QuestWizardData,
} from '@/lib/schemas/quest.schema';

interface AdminSettingsPanelProps {
  data: QuestWizardData;
  errors: Record<string, string>;
  onChange: (next: QuestWizardData['advanced']) => void;
}

/**
 * Admin-only quest settings.
 *
 * The user-facing flow keeps the defaults for these fields, so this panel is
 * rendered only when the wizard runs in admin mode. It carries the three
 * controls that the standalone admin form used to own: difficulty,
 * participant cap, and free-form tags.
 */
const AdminSettingsPanel = ({
  data,
  errors,
  onChange,
}: AdminSettingsPanelProps) => {
  const [tagInput, setTagInput] = useState('');
  const { advanced } = data;

  const addTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (!newTag || advanced.tags.includes(newTag)) {
      setTagInput('');
      return;
    }
    onChange({ ...advanced, tags: [...advanced.tags, newTag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    onChange({ ...advanced, tags: advanced.tags.filter((t) => t !== tag) });
  };

  return (
    <fieldset
      data-testid="admin-settings-panel"
      className="mt-6 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
    >
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
        Admin settings
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="advanced-difficulty"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Difficulty
          </label>
          <select
            id="advanced-difficulty"
            name="difficulty"
            value={advanced.difficulty}
            onChange={(event) =>
              onChange({
                ...advanced,
                difficulty: event.target
                  .value as QuestWizardData['advanced']['difficulty'],
              })
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {QUEST_DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="advanced-max-participants"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Max participants
          </label>
          <input
            id="advanced-max-participants"
            name="maxParticipants"
            type="number"
            min={1}
            max={10000}
            value={advanced.maxParticipants}
            onChange={(event) =>
              onChange({
                ...advanced,
                maxParticipants: Number(event.target.value),
              })
            }
            aria-invalid={Boolean(errors['advanced.maxParticipants'])}
            aria-describedby={
              errors['advanced.maxParticipants']
                ? 'advanced-max-participants-error'
                : undefined
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          {errors['advanced.maxParticipants'] && (
            <p
              id="advanced-max-participants-error"
              className="mt-1 text-sm text-red-500"
            >
              {errors['advanced.maxParticipants']}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="advanced-tags"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Tags
        </label>
        {advanced.tags.length > 0 && (
          <ul className="mb-2 flex list-none flex-wrap gap-2 p-0">
            {advanced.tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag: ${tag}`}
                  className="ml-1 hover:text-cyan-950 dark:hover:text-cyan-100"
                >
                  <span aria-hidden="true">x</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id="advanced-tags"
          type="text"
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="Type a tag and press Enter"
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>
    </fieldset>
  );
};

export default AdminSettingsPanel;
