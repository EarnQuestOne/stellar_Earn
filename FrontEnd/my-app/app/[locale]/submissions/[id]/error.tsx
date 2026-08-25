'use client';

import { useEffect } from 'react';

interface SubmissionErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Error boundary for the submission detail route (#2225) */
export default function SubmissionDetailError({
  error,
  reset,
}: SubmissionErrorBoundaryProps) {
  useEffect(() => {
    console.error('[SubmissionDetail] error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong loading this submission.
      </p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}