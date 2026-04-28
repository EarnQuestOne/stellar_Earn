'use client';

/**
 * Props for the progress bar component.
 */
interface ProgressBarProps {
  value?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  indeterminate?: boolean;
  className?: string;
}

/**
 * Renders a progress bar with optional label and indeterminate state.
 */
export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = false,
  indeterminate = false,
  className = '',
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(value, max));
  const percent = max > 0 ? Math.round((safeValue / max) * 100) : 0;

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{label ?? 'Progress'}</span>
          {showValue ? <span>{percent}%</span> : null}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : safeValue}
        aria-valuetext={indeterminate ? 'In progress' : `${percent}%`}
      >
        {indeterminate ? (
          <div className="animate-progress-indeterminate h-full w-1/2 rounded-full bg-[#089ec3]" />
        ) : (
          <div
            className="h-full rounded-full bg-[#089ec3] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}
