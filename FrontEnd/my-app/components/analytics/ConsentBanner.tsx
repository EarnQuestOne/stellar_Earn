'use client';

import { useEffect, useState } from 'react';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

/**
 * Cookie/analytics consent banner. Shown until user grants or denies.
 * Privacy policy compliant: no tracking until consent.
 */
export function ConsentBanner() {
  const { consentStatus, setConsent } = useAnalytics();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || consentStatus !== 'pending') return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"
      role="dialog"
      aria-label="Analytics consent"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We use analytics to improve the platform (page views and anonymized events). No PII is collected without your
          consent. See our privacy policy for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent('denied')}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setConsent('granted')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
