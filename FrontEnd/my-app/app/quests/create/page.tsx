'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import QuestWizard from '@/components/quest/QuestWizard';

export default function CreateQuestPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <Link
            href="/quests"
            className="hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Quest Board
          </Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-zinc-200">Create</span>
        </nav>
        <QuestWizard />
      </div>
    </AppLayout>
  );
}
