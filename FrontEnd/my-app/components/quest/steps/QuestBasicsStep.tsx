'use client';

import RichTextEditor from '@/components/quest/RichTextEditor';
import type { QuestWizardData } from '@/lib/schemas/quest.schema';
import { QUEST_CATEGORIES } from '@/lib/schemas/quest.schema';

interface QuestBasicsStepProps {
  data: QuestWizardData;
  errors: Record<string, string>;
  onChange: (next: QuestWizardData['basics']) => void;
}

const QuestBasicsStep = ({ data, errors, onChange }: QuestBasicsStepProps) => {
  const hasTitleError = Boolean(errors['basics.title']);
  const hasShortDescriptionError = Boolean(errors['basics.shortDescription']);
  const hasDescriptionError = Boolean(errors['basics.description']);

  return (
    <section className="space-y-6" data-testid="step-basics">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Quest Title
        </label>
        <input
          value={data.basics.title}
          onChange={(event) =>
            onChange({ ...data.basics, title: event.target.value })
          }
          placeholder="Ex: Build an Open Source Stellar Explorer"
          className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 ${
            hasTitleError
              ? 'border-red-400 focus:border-red-500 dark:border-red-800'
              : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
          }`}
        />
        {errors['basics.title'] && (
          <p className="mt-1 text-xs text-red-600">{errors['basics.title']}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Short Description
        </label>
        <input
          value={data.basics.shortDescription}
          maxLength={200}
          onChange={(event) =>
            onChange({ ...data.basics, shortDescription: event.target.value })
          }
          placeholder="One-line summary for quest cards"
          className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 ${
            hasShortDescriptionError
              ? 'border-red-400 focus:border-red-500 dark:border-red-800'
              : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
          }`}
        />
        <div className="mt-1 flex justify-between text-xs">
          <span
            className={
              hasShortDescriptionError
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }
          >
            {errors['basics.shortDescription'] ?? 'Maximum 200 characters'}
          </span>
          <span>{data.basics.shortDescription.length}/200</span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Category
        </label>
        <select
          value={data.basics.category}
          onChange={(event) =>
            onChange({
              ...data.basics,
              category: event.target
                .value as QuestWizardData['basics']['category'],
            })
          }
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
        >
          {QUEST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 space-y-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Description (Rich Text)
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Format the quest with headings, lists, quotes, and code blocks.
          </p>
        </div>

        <RichTextEditor
          value={data.basics.description}
          hasError={hasDescriptionError}
          onChange={(value) => onChange({ ...data.basics, description: value })}
        />
        {errors['basics.description'] && (
          <p className="mt-1 text-xs text-red-600">
            {errors['basics.description']}
          </p>
        )}
      </div>
    </section>
  );
};

export default QuestBasicsStep;
