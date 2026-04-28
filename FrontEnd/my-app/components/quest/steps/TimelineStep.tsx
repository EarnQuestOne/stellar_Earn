'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { QuestWizardData } from '@/lib/schemas/quest.schema';
import { TIMEZONE_OPTIONS } from '@/lib/schemas/quest.schema';

interface TimelineStepProps {
  data: QuestWizardData;
  errors: Record<string, string>;
  onChange: (next: QuestWizardData['timeline']) => void;
}

const TimelineStep = ({ data, errors, onChange }: TimelineStepProps) => {
  const hasDeadlineError = Boolean(errors['timeline.deadline']);
  const hasMilestoneError = Boolean(errors['timeline.milestones']);

  const updateMilestone = (
    id: string,
    field: 'title' | 'dueDate',
    value: string
  ) => {
    onChange({
      ...data.timeline,
      milestones: data.timeline.milestones.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    });
  };

  const addMilestone = () => {
    onChange({
      ...data.timeline,
      milestones: [
        ...data.timeline.milestones,
        {
          id: `milestone-${Date.now()}`,
          title: '',
          dueDate: '',
        },
      ],
    });
  };

  const removeMilestone = (id: string) => {
    onChange({
      ...data.timeline,
      milestones: data.timeline.milestones.filter((item) => item.id !== id),
    });
  };

  return (
    <section className="space-y-6" data-testid="step-timeline">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Deadline
          </span>
          <input
            type="datetime-local"
            value={data.timeline.deadline}
            onChange={(event) =>
              onChange({ ...data.timeline, deadline: event.target.value })
            }
            className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 ${
              hasDeadlineError
                ? 'border-red-400 focus:border-red-500 dark:border-red-800'
                : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
            }`}
          />
          {errors['timeline.deadline'] && (
            <p className="mt-1 text-xs text-red-600">
              {errors['timeline.deadline']}
            </p>
          )}
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Timezone
          </span>
          <select
            value={data.timeline.timezone}
            onChange={(event) =>
              onChange({ ...data.timeline, timezone: event.target.value })
            }
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
          >
            {TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={
          hasMilestoneError
            ? 'rounded-2xl border border-red-300/70 p-3 dark:border-red-900/60'
            : ''
        }
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Milestones
          </h3>
          <button
            type="button"
            onClick={addMilestone}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </button>
        </div>

        <div className="space-y-2">
          {data.timeline.milestones.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-xl border border-zinc-200 bg-white p-3 sm:grid-cols-12 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <input
                value={item.title}
                onChange={(event) =>
                  updateMilestone(item.id, 'title', event.target.value)
                }
                placeholder={`Milestone ${index + 1}`}
                className="sm:col-span-7 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
              <input
                type="datetime-local"
                value={item.dueDate}
                onChange={(event) =>
                  updateMilestone(item.id, 'dueDate', event.target.value)
                }
                className="sm:col-span-4 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => removeMilestone(item.id)}
                className="sm:col-span-1 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Remove milestone"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.timeline.milestones.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No milestones added yet. Add optional milestones to break the
              quest into checkpoints.
            </div>
          )}
        </div>
        {errors['timeline.milestones'] && (
          <p className="mt-2 text-xs text-red-600">
            {errors['timeline.milestones']}
          </p>
        )}
      </div>
    </section>
  );
};

export default TimelineStep;
