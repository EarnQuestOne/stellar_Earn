'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { DeliverableItem } from '@/lib/schemas/quest.schema';

interface RequirementsBuilderProps {
  items: DeliverableItem[];
  onChange: (items: DeliverableItem[]) => void;
}

function createDeliverable(index: number): DeliverableItem {
  return {
    id: `deliverable-${Date.now()}-${index}`,
    title: '',
    details: '',
    required: true,
  };
}

const RequirementsBuilder = ({ items, onChange }: RequirementsBuilderProps) => {
  const handleFieldChange = (
    id: string,
    field: keyof DeliverableItem,
    value: string | boolean
  ) => {
    onChange(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleAdd = () => {
    onChange([...items, createDeliverable(items.length + 1)]);
  };

  const handleRemove = (id: string) => {
    if (items.length === 1) {
      return;
    }
    onChange(items.filter((item) => item.id !== id));
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    id: string
  ) => {
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    destinationId: string
  ) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');

    if (!sourceId || sourceId === destinationId) {
      return;
    }

    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const destinationIndex = items.findIndex(
      (item) => item.id === destinationId
    );
    if (sourceIndex < 0 || destinationIndex < 0) {
      return;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);
    onChange(reordered);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(event) => handleDragStart(event, item.id)}
          onDrop={(event) => handleDrop(event, item.id)}
          onDragOver={handleDragOver}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <GripVertical className="h-4 w-4" aria-hidden="true" />
              Deliverable {index + 1}
            </div>
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={item.title}
              onChange={(event) =>
                handleFieldChange(item.id, 'title', event.target.value)
              }
              placeholder="What should the contributor submit?"
              className="md:col-span-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <input
              value={item.details}
              onChange={(event) =>
                handleFieldChange(item.id, 'details', event.target.value)
              }
              placeholder="Success criteria"
              className="md:col-span-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-cyan-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <label className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={item.required}
                onChange={(event) =>
                  handleFieldChange(item.id, 'required', event.target.checked)
                }
                className="h-4 w-4 rounded border-zinc-400 text-cyan-600 focus:ring-cyan-500"
              />
              Required
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-cyan-500/60 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Deliverable
      </button>
    </div>
  );
};

export default RequirementsBuilder;
