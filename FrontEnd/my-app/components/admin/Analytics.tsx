'use client';

import { useEffect, useState } from 'react';
import { getAdminAnalyticsSnapshot, isAnalyticsTestMode, type AdminAnalyticsSnapshot } from '@/lib/utils/tracking';

export function Analytics() {
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);
  const testMode = isAnalyticsTestMode();

  useEffect(() => {
    const data = getAdminAnalyticsSnapshot();
    setSnapshot(data);
    const t = setInterval(() => setSnapshot(getAdminAnalyticsSnapshot()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Loading analytics...</p>
      </div>
    );
  }

  const { pageViews, events, totalPageViews, totalEvents } = snapshot;
  const topPaths = Object.entries(pageViews).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topEvents = Object.entries(events).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="space-y-6">
      {testMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <strong>Testing mode:</strong> Analytics are logged locally only. Set{' '}
          <code className="rounded bg-amber-100 dark:bg-amber-900/40">NEXT_PUBLIC_ANALYTICS_TEST_MODE=false</code> to
          enable production tracking (when integrated with GA/Mixpanel).
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total page views</h3>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalPageViews.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total events</h3>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalEvents.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Page views by path</h3>
          <ul className="space-y-2">
            {topPaths.length === 0 ? (
              <li className="text-sm text-zinc-500 dark:text-zinc-400">No page views yet (consent may be pending).</li>
            ) : (
              topPaths.map(([path, count]) => (
                <li key={path} className="flex justify-between text-sm">
                  <span className="truncate text-zinc-700 dark:text-zinc-300" title={path}>
                    {path}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{count.toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Events by type</h3>
          <ul className="space-y-2">
            {topEvents.length === 0 ? (
              <li className="text-sm text-zinc-500 dark:text-zinc-400">No events yet.</li>
            ) : (
              topEvents.map(([name, count]) => (
                <li key={name} className="flex justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{count.toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No PII is stored. Data resets on page refresh (in-memory). For persistent analytics, integrate GA or Mixpanel.
      </p>
    </div>
  );
}
