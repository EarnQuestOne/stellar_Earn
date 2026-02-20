'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full text-center">
            {/* Error Illustration */}
            <div className="mb-8">
              <div className="text-7xl font-bold text-zinc-700 mb-4">⚠️</div>
              <div className="text-2xl font-bold text-zinc-200 mb-2">Something Went Wrong</div>
              <p className="text-zinc-400 text-lg">
                We've encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="text-2xl">📋</div>
                <h3 className="text-lg font-medium text-zinc-200">Error Information</h3>
              </div>
              <div className="text-left">
                <div className="mb-3">
                  <span className="text-zinc-400 text-sm">Error Type:</span>
                  <div className="text-zinc-200 font-mono text-sm mt-1">
                    {error.name || 'Unknown Error'}
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-zinc-400 text-sm">Message:</span>
                  <div className="text-zinc-200 font-mono text-sm mt-1 break-words">
                    {error.message || 'No message available'}
                  </div>
                </div>
                {error.digest && (
                  <div>
                    <span className="text-zinc-400 text-sm">Error ID:</span>
                    <div className="text-zinc-200 font-mono text-sm mt-1">
                      {error.digest}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload
              </button>
            </div>

            {/* Support Information */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-zinc-500 text-sm">
                If this problem persists, please contact our support team.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-3 text-xs text-zinc-500">
                <span>Time: {new Date().toLocaleString()}</span>
                <span>Status: Error Detected</span>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}