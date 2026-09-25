'use client';

/**
 * Error Panel Demo Page
 *
 * This page is used for testing the EnvValidator component's
 * error panel rendering. It simulates the error state for E2E testing.
 *
 * Route: /error-panel-demo
 * Environment: Test/E2E testing only
 */

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';

export default function ErrorPanelDemoPage() {
  // Debug/demo route — never publicly reachable in production (see #1922).
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Simulate validation delay
    const timer = setTimeout(() => {
      setIsValidating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state during validation
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Show error panel (this is what we're testing)
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div
        className="max-w-2xl w-full bg-zinc-900 border border-red-500/20 rounded-lg p-8"
        role="region"
        aria-label="Configuration Error"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Configuration Error
            </h1>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-4 mb-6">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                {`Missing required environment variables:

• NEXT_PUBLIC_API_BASE_URL: Backend API base URL

Please check your .env.local file and restart the application.`}
              </pre>
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-2">
                  How to fix this:
                </h2>
                <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                  <li>
                    Create a{' '}
                    <code className="bg-zinc-800 px-2 py-1 rounded text-sm">
                      .env.local
                    </code>{' '}
                    file in the project root
                  </li>
                  <li>Add the required environment variables</li>
                  <li>Restart the development server</li>
                </ol>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-2">
                  Example .env.local:
                </h2>
                <pre className="bg-zinc-950 border border-zinc-800 rounded p-4 text-sm text-zinc-300 overflow-x-auto">
                  {`NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=your-contract-id`}
                </pre>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-zinc-500">
                  For more information, see the{' '}
                  <a
                    href="/README.md"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    README.md
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
