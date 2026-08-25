'use client';

import dynamic from 'next/dynamic';

/**
 * Fix #2223: lazy-load the QuestEditor rich text bundle so it is not included
 * in the initial page JS. The editor is only needed when the user reaches the
 * description step of the wizard, so deferring the load improves TTI.
 */
export const LazyQuestEditor = dynamic(
  () => import('./QuestEditor').then((m) => ({ default: m.QuestEditor ?? m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" aria-label="Loading editor..." />
    ),
  },
);