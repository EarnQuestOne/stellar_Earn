'use client';

import { SubmissionStatus } from '@/lib/types/submission';

interface StatusFilterProps {
  selectedStatus?: SubmissionStatus;
  onStatusChange: (status: SubmissionStatus | undefined) => void;
}

const statusOptions = [
  {
    value: SubmissionStatus.APPROVED,
    label: 'Approved',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    color: 'text-green-600',
  },
  {
    value: SubmissionStatus.PENDING,
    label: 'Pending',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
    ),
    color: 'text-orange-600',
  },
  {
    value: SubmissionStatus.UNDER_REVIEW,
    label: 'Under Review',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    color: 'text-blue-600',
  },
  {
    value: SubmissionStatus.REJECTED,
    label: 'Rejected',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
    color: 'text-red-600',
  },
] as const;

export function StatusFilter({
  selectedStatus,
  onStatusChange,
}: StatusFilterProps) {
  const handleToggle = (status: SubmissionStatus) => {
    // Toggle: if already selected, deselect (pass undefined), otherwise select
    if (selectedStatus === status) {
      onStatusChange(undefined);
    } else {
      onStatusChange(status);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2 justify-end"
      role="tablist"
      aria-label="Filter submissions by status"
    >
      {statusOptions.map((option) => {
        const isSelected = selectedStatus === option.value;
        return (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            role="tab"
            aria-selected={isSelected}
            aria-controls="submissions-list"
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
              isSelected
                ? `text-white`
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
            style={
              isSelected
                ? {
                    borderColor: '#089ec3',
                    backgroundColor: '#089ec3',
                  }
                : ({
                    '--tw-ring-color': '#089ec3',
                  } as React.CSSProperties)
            }
          >
            <span className={isSelected ? 'text-white' : option.color}>
              {option.icon}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
