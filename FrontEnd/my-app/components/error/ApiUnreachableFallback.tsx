import React from 'react';
import { RefreshCw, ServerCrash } from 'lucide-react';
import { Button } from '../ui/button';

interface ApiUnreachableFallbackProps {
  /** Called when the user clicks "Try Again". */
  onRetry: () => void;
  /** Whether a recheck is currently in progress. */
  isChecking?: boolean;
}

/**
 * Shown when the browser has internet access but the API base URL is
 * unreachable (server down, misconfigured URL, CORS pre-flight blocked, etc.).
 *
 * This is distinct from {@link OfflineFallback} which is shown when the
 * device has no internet connection at all.
 */
export const ApiUnreachableFallback: React.FC<ApiUnreachableFallbackProps> = ({
  onRetry,
  isChecking = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-gray-50 dark:bg-gray-900 rounded-lg"
    >
      <div className="p-4 mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
        <ServerCrash
          className="w-12 h-12 text-yellow-600 dark:text-yellow-400"
          aria-hidden="true"
        />
      </div>

      <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
        Server unreachable
      </h2>

      <p className="text-gray-600 dark:text-gray-300 mb-2 max-w-md">
        We could not reach the StellarEarn API. You might still be able to
        browse cached content, but actions like submitting quests or claiming
        rewards are unavailable until the connection is restored.
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        If this persists, please check your network settings or contact support.
      </p>

      <Button
        onClick={onRetry}
        disabled={isChecking}
        variant="default"
        className="flex items-center gap-2"
        aria-label={isChecking ? 'Checking server…' : 'Retry server connection'}
      >
        <RefreshCw
          className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {isChecking ? 'Checking…' : 'Try Again'}
      </Button>
    </div>
  );
};
