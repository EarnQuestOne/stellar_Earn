'use client';

import { useState, useEffect } from 'react';
import { calculateTimeRemaining, type TimeRemaining } from '@/lib/utils/date';

interface DeadlineTimerProps {
  deadline: string;
  isExpired?: boolean;
}

export function DeadlineTimer({
  deadline,
  isExpired = false,
}: DeadlineTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline)
  );

  useEffect(() => {
    if (isExpired || calculateTimeRemaining(deadline).isExpired) return;

    /**
     * Fix #2213: use Date.now() to compute the next aligned second boundary
     * instead of a fixed 1000 ms interval, preventing drift over time.
     * The interval ref is also properly cleared to prevent leaks.
     */
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const next = calculateTimeRemaining(deadline);
      setTimeRemaining(next);
      if (next.isExpired) return; // stop scheduling

      // Schedule next tick at the start of the next second to reduce drift
      const msUntilNextSecond = 1000 - (Date.now() % 1000);
      timeoutId = setTimeout(tick, msUntilNextSecond);
    };

    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    timeoutId = setTimeout(tick, msUntilNextSecond);

    return () => clearTimeout(timeoutId);
  }, [deadline, isExpired]);

  if (isExpired || timeRemaining.isExpired) {
    return (
      <div
        role="status"
        aria-label="Quest expired"
        className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/10"
      >
        <p className="font-semibold text-red-900 dark:text-red-100">
          Quest Expired
        </p>
        <p className="text-sm text-red-700 dark:text-red-300">
          This quest is no longer accepting submissions
        </p>
      </div>
    );
  }

  const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 24;
  const humanReadableTime = `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`;

  return (
    <div
      className={`rounded-lg border p-6 ${isUrgent ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/10' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'}`}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Time remaining: {humanReadableTime}
      </p>
      <div className="grid grid-cols-4 gap-4" aria-hidden="true">
        {[
          { value: timeRemaining.days, label: 'Days' },
          {
            value: String(timeRemaining.hours).padStart(2, '0'),
            label: 'Hours',
          },
          {
            value: String(timeRemaining.minutes).padStart(2, '0'),
            label: 'Mins',
          },
          {
            value: String(timeRemaining.seconds).padStart(2, '0'),
            label: 'Secs',
          },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <div
              className={`text-3xl font-bold ${isUrgent ? 'text-orange-600' : 'text-primary'}`}
            >
              {value}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {label}
            </div>
          </div>
        ))}
      </div>
      {isUrgent && (
        <p
          role="alert"
          className="mt-4 text-sm text-orange-700 dark:text-orange-300"
        >
          Less than 24 hours remaining!
        </p>
      )}
    </div>
  );
}
