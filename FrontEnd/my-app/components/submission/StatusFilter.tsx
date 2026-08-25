'use client';

import { useRef } from 'react';
import { SubmissionStatus } from '@/lib/types/submission';

interface StatusFilterProps {
  selectedStatus?: SubmissionStatus;
  onStatusChange: (status: SubmissionStatus | undefined) => void;
}

const statusOptions = [
  { value: SubmissionStatus.APPROVED,     label: 'Approved',     color: 'text-green-600' },
  { value: SubmissionStatus.PENDING,      label: 'Pending',      color: 'text-orange-600' },
  { value: SubmissionStatus.UNDER_REVIEW, label: 'Under Review', color: 'text-blue-600' },
  { value: SubmissionStatus.REJECTED,     label: 'Rejected',     color: 'text-red-600' },
] as const;

export function StatusFilter({ selectedStatus, onStatusChange }: StatusFilterProps) {
  /**
   * Fix #2232: track user selection in a ref so a parent refetch that passes
   * undefined/stale props does not visually reset the active filter button.
   */
  const lastSelection = useRef<SubmissionStatus | undefined>(selectedStatus);

  const handleToggle = (status: SubmissionStatus) => {
    const next = lastSelection.current === status ? undefined : status;
    lastSelection.current = next;
    onStatusChange(next);
  };

  const activeStatus = selectedStatus ?? lastSelection.current;

  return (
    <div className="flex flex-wrap gap-2 justify-end" role="tablist" aria-label="Filter submissions by status">
      {statusOptions.map((option) => {
        const isSelected = activeStatus === option.value;
        return (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            role="tab"
            aria-selected={isSelected}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSelected
                ? 'border-primary bg-primary text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}