'use client';

import type { Quest } from '@/lib/types/dashboard';

interface ActiveQuestsProps {
  quests: Quest[];
  isLoading: boolean;
}

type QuestStatus = 'in_progress' | 'pending' | 'review';

interface SimpleQuest {
  id: string;
  title: string;
  daysLeft: number;
  status: QuestStatus;
  reward: number;
}

function QuestRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800 last:border-0">
      <div className="flex-1">
        <div className="h-5 w-48 animate-pulse rounded bg-zinc-700 mb-2" />
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-700" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-700" />
        <div className="h-5 w-16 animate-pulse rounded bg-zinc-700" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: QuestStatus }) {
  const statusConfig = {
    in_progress: {
      label: 'In Progress',
      className: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
    },
    pending: {
      label: 'Pending',
      className: 'bg-zinc-700/50 text-zinc-300 border border-zinc-600',
    },
    review: {
      label: 'In Review',
      className: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function QuestRow({ quest }: { quest: SimpleQuest }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30 -mx-4 px-4 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-zinc-100 truncate">{quest.title}</h4>
        <p className="text-sm text-zinc-500">{quest.daysLeft} days left</p>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <StatusBadge status={quest.status} />
        <span className="text-cyan-400 font-medium whitespace-nowrap">{quest.reward} XLM</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3">🎯</div>
      <h4 className="font-medium text-zinc-100">No active quests</h4>
      <p className="mt-1 text-sm text-zinc-500">
        Browse available quests to start earning
      </p>
    </div>
  );
}

export function ActiveQuests({ quests, isLoading }: ActiveQuestsProps) {
  // Transform quests to simple format or use mock data
  const simpleQuests: SimpleQuest[] = quests.length > 0
    ? quests.map(q => ({
        id: q.id,
        title: q.title,
        daysLeft: Math.ceil((new Date(q.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        status: q.progress > 50 ? 'in_progress' as QuestStatus : 'pending' as QuestStatus,
        reward: q.reward,
      }))
    : [
        { id: '1', title: 'Smart Contract Security Review', daysLeft: 3, status: 'in_progress' as QuestStatus, reward: 250 },
        { id: '2', title: 'Documentation Update', daysLeft: 5, status: 'pending' as QuestStatus, reward: 75 },
        { id: '3', title: 'UI Component Library', daysLeft: 7, status: 'in_progress' as QuestStatus, reward: 150 },
      ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-zinc-100">Active Quests</h3>
        <button className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
          View All
        </button>
      </div>

      {isLoading ? (
        <div>
          <QuestRowSkeleton />
          <QuestRowSkeleton />
          <QuestRowSkeleton />
        </div>
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
