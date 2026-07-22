'use client';

import type { Quest } from '@/lib/types/dashboard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormatter } from '@/lib/hooks/useFormatter';

interface ActiveQuestsProps {
  quests: Quest[];
  isLoading: boolean;
}

type QuestStatus = 'in_progress' | 'pending' | 'review';

interface SimpleQuest {
  id: string;
  title: string;
  daysLeft: number;
  // ── Added: raw deadline string ────────────────────────────────────────────
  // Previously SimpleQuest only stored daysLeft (an integer), which forced
  // QuestRow to render "{daysLeft} days left" — an English-only hardcoded
  // string with no locale awareness.
  // Now we carry the original deadline string through so QuestRow can call
  // date(deadline, 'relative') and get a locale-correct output like
  // "in 3 days" / "dans 3 jours" / "in 3 Tagen".
  // ─────────────────────────────────────────────────────────────────────────
  deadline?: string;
  status: QuestStatus;
  reward: number;
}

function StatusBadge({ status }: { status: QuestStatus }) {
  const statusConfig = {
    in_progress: {
      label: 'In Progress',
      className: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
    },
    pending: {
      label: 'Pending',
      className:
        'bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-700/50 dark:text-zinc-300 dark:border-zinc-600',
    },
    review: {
      label: 'In Review',
      className: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function QuestRow({ quest }: { quest: SimpleQuest }) {
  const { date, compactReward } = useFormatter();

  // ── Deadline label ────────────────────────────────────────────────────────
  // Before: `{quest.daysLeft} days left`
  //   → Always English. No plural awareness ("1 days left").
  //     Produced from an integer with no locale context.
  //
  // After: date(quest.deadline, 'relative') when a real deadline exists
  //   → "in 3 days" (en-US) / "dans 3 jours" (fr-FR) / "in 3 Tagen" (de-DE)
  //   → Intl.RelativeTimeFormat handles singular/plural automatically
  //     ("in 1 day" not "in 1 days").
  //
  // Fallback for mock data rows (no deadline string):
  //   → daysLeft integer is still available as a last resort display.
  // ─────────────────────────────────────────────────────────────────────────
  const deadlineLabel = quest.deadline
    ? date(quest.deadline, 'relative')
    : `${quest.daysLeft} day${quest.daysLeft === 1 ? '' : 's'} left`;

  // ── Reward label ──────────────────────────────────────────────────────────
  // Before: `{quest.reward} XLM`
  //   → Raw number. "1200 XLM" regardless of locale.
  //
  // After: compactReward() — badge-friendly compact formatting
  //   → "250 XLM" stays "250 XLM" (compact notation only kicks in at 1000+)
  //   → "1,200 XLM" → "1.2K XLM" — fits the tight row layout
  //   → Locale-correct separators in all cases
  // ─────────────────────────────────────────────────────────────────────────
  const rewardLabel = compactReward(quest.reward, {
    type: 'custom',
    label: { singular: 'XLM', plural: 'XLM' },
  });

  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-800 last:border-0 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 -mx-4 px-4 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {quest.title}
        </h4>
        <p className="text-sm text-zinc-500">{deadlineLabel}</p>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <StatusBadge status={quest.status} />
        <span className="text-cyan-400 font-medium whitespace-nowrap">
          {rewardLabel}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">🎯</div>
      <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
        No active quests
      </h4>
      <p className="mt-1 text-sm text-zinc-500">
        Browse available quests to start earning
      </p>
    </div>
  );
}

export function ActiveQuests({ quests, isLoading }: ActiveQuestsProps) {
  const simpleQuests: SimpleQuest[] =
    quests.length > 0
      ? quests.map((q) => ({
          id: q.id,
          title: q.title,
          // daysLeft math is kept — it feeds the mock-data fallback only.
          // Real rows now use deadline string directly for locale formatting.
          daysLeft: q.deadline
            ? Math.ceil(
                (new Date(q.deadline).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
          deadline: q.deadline ?? undefined,
          status: 'in_progress' as QuestStatus,
          reward: Number(q.rewardAmount),
        }))
      : [
          // Mock rows carry no deadline — QuestRow falls back to daysLeft display.
          {
            id: '1',
            title: 'Smart Contract Security Review',
            daysLeft: 3,
            status: 'in_progress' as QuestStatus,
            reward: 250,
          },
          {
            id: '2',
            title: 'Documentation Update',
            daysLeft: 5,
            status: 'pending' as QuestStatus,
            reward: 75,
          },
          {
            id: '3',
            title: 'UI Component Library',
            daysLeft: 7,
            status: 'in_progress' as QuestStatus,
            reward: 150,
          },
        ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Active Quests
        </h3>
        <button className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
          View All
        </button>
      </div>

      {isLoading ? (
        <Skeleton.List items={3} />
      ) : simpleQuests.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {simpleQuests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}
