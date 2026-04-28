'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressBar } from '@/components/ui/ProgressBar';

/**
 * Props for the loading overlay that blocks interaction when active.
 */
interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  progress?: number;
  blockInteraction?: boolean;
}

/**
 * Displays a full-screen loading overlay with optional progress state.
 */
export function LoadingOverlay({
  isOpen,
  message = 'Loading...',
  progress,
  blockInteraction = true,
}: LoadingOverlayProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center bg-white/75 dark:bg-zinc-900/75 ${
        blockInteraction ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white p-4 text-center shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-3 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-200">{message}</p>
        {typeof progress === 'number' ? (
          <ProgressBar className="mt-3" value={progress} max={100} showValue />
        ) : (
          <ProgressBar className="mt-3" indeterminate />
        )}
      </div>
    </div>
  );
}
