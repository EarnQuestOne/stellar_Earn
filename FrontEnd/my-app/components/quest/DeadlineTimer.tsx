'use client';

import { useState, useEffect } from 'react';

interface DeadlineTimerProps {
  deadline: string;
  isExpired?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(deadline: string): TimeRemaining {
  const now = new Date().getTime();
  const deadlineDate = new Date(deadline).getTime();
  const total = deadlineDate - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total };
}

export function DeadlineTimer({ deadline, isExpired = false }: DeadlineTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline)
  );

  useEffect(() => {
    if (isExpired || timeRemaining.total <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, isExpired, timeRemaining.total]);

  if (isExpired || timeRemaining.total <= 0) {
    return (
      <div
        role="status"
        aria-label="Quest expired"
        className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/10"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">Quest Expired</h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              This quest is no longer accepting submissions
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 24;
  const humanReadableTime = `${timeRemaining.days} days, ${timeRemaining.hours} hours, ${timeRemaining.minutes} minutes, ${timeRemaining.seconds} seconds`;

  return (
    <div
      className={`rounded-lg border p-6 ${
        isUrgent
          ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/10'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        <svg
          className={`h-5 w-5 ${isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-600 dark:text-zinc-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3
          className={`font-semibold ${isUrgent ? 'text-orange-900 dark:text-orange-100' : 'text-zinc-900 dark:text-zinc-50'}`}
        >
          {isUrgent ? 'Deadline Approaching' : 'Time Remaining'}
        </h3>
      </div>

      {/* Screen-reader accessible time announcement */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Time remaining: {humanReadableTime}
      </p>

      <div className="grid grid-cols-4 gap-4" aria-hidden="true">
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-[#089ec3]'}`}
          >
            {timeRemaining.days}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Days</div>
        </div>
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-[#089ec3]'}`}
          >
            {String(timeRemaining.hours).padStart(2, '0')}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Hours</div>
        </div>
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-[#089ec3]'}`}
          >
            {String(timeRemaining.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Minutes</div>
        </div>
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-[#089ec3]'}`}
          >
            {String(timeRemaining.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Seconds</div>
        </div>
      </div>

      {isUrgent && (
        <div className="mt-4 text-sm text-orange-700 dark:text-orange-300" role="alert">
          Less than 24 hours remaining!
        </div>
      )}
    </div>
  );
}
