'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('not_found_hit', {
      path: pathname ?? 'unknown',
    });
  }, [pathname, trackEvent]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-7 flex flex-col items-center gap-4">
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-200 bg-white/60 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
            aria-hidden="true"
          >
            <svg
              className="h-12 w-12 text-[#089ec3]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="absolute -right-1 -top-2 rounded-full bg-[#089ec3] px-2 py-1 text-xs font-bold text-white">
              ?
            </div>
          </div>

          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Page not found
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Sorry, we couldn’t find the page you were looking for. Try searching
            for a quest or head back home.
          </p>
        </div>

        <div className="mx-auto mb-8 rounded-xl border border-zinc-200 bg-white/70 p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Find quests by name
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Search is instant and uses live quest data.
              </p>
            </div>
          </div>

          <GlobalSearch placeholder="Search quests by name..." />
        </div>

        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-zinc-200 px-6 py-3 font-medium text-zinc-800 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Go back
          </button>

          <Link
            href="/"
            className="rounded-lg bg-[#089ec3] px-6 py-3 text-center font-medium text-white transition-colors hover:bg-[#0ab8d4]"
          >
            Home
          </Link>

          <Link
            href="/quests"
            className="rounded-lg bg-zinc-100 px-6 py-3 text-center font-medium text-zinc-800 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Browse quests
          </Link>
        </div>
      </div>
    </div>
  );
}
