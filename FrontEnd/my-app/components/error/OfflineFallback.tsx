import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';

interface OfflineFallbackProps {
  onRetry: () => void;
}

/**
 * Shown when the device has no internet connection (`navigator.onLine === false`
 * or an `offline` browser event has fired).
 *
 * For the case where the device is online but the API is unreachable, see
 * {@link ApiUnreachableFallback}.
 */
export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
  onRetry,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-gray-50 dark:bg-gray-900 rounded-lg"
    >
      <div className="p-4 mb-4 bg-gray-200 dark:bg-gray-800 rounded-full">
        <WifiOff
          className="w-12 h-12 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        />
      </div>
      <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
        You are offline
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
        We cannot reach the server at the moment. You can still view cached
        content, but some interactions may be restricted until connection is
        restored.
      </p>
      <Button
        onClick={onRetry}
        variant="default"
        className="flex items-center gap-2"
        aria-label="Retry connection"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Try Again
      </Button>
    </div>
  );
};
