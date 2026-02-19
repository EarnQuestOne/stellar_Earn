'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ServerError() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 500 Illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-zinc-700 mb-4">500</div>
          <div className="text-2xl font-bold text-zinc-200 mb-2">Server Error</div>
          <p className="text-zinc-400 text-lg">
            Something went wrong on our end. We're working to fix it.
          </p>
        </div>

        {/* Error Message */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-2xl">🔧</div>
            <h3 className="text-lg font-medium text-zinc-200">What Happened?</h3>
          </div>
          <div className="text-zinc-400 text-left max-w-md mx-auto">
            <p className="mb-3">
              Our servers are experiencing technical difficulties. This is usually temporary and 
              our team has been notified.
            </p>
            <p>
              You can try refreshing the page or come back in a few minutes while we resolve this issue.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.refresh()}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Page
          </button>
          
          <Link
            href="/"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Status Information */}
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>System Status: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>API: Degraded Performance</span>
            </div>
          </div>
          <p className="mt-3 text-zinc-500 text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}