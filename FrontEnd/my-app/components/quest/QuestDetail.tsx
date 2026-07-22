'use client';

import { QuestHeader } from './QuestHeader';
import { RequirementsList } from './RequirementsList';
import { RewardDisplay } from './RewardDisplay';
import { DeadlineTimer } from './DeadlineTimer';
import { SubmissionForm } from './SubmissionForm';
import type { Quest } from '@/lib/types/quest';
import { QuestStatus } from '@/lib/types/quest';
import { useFormatter } from '@/lib/hooks/useFormatter';

interface QuestDetailProps {
  quest: Quest;
}

export function QuestDetail({ quest }: QuestDetailProps) {
  // useFormatter resolves navigator.language once and returns memoised,
  // locale-bound formatting functions.
  const { date } = useFormatter();

  const isExpired = quest.status === QuestStatus.EXPIRED;
  const isCompleted = quest.status === QuestStatus.COMPLETED;
  const isFull =
    quest.maxParticipants !== undefined &&
    quest.currentParticipants !== undefined &&
    quest.currentParticipants >= quest.maxParticipants;
  const hasDeadline = quest.deadline && !isExpired && !isCompleted;

  const handleSubmission = (data: {
    questId: string;
    proof: File | null;
    notes: string;
  }) => {
    console.log('Quest submission (mock):', data);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <QuestHeader
        title={quest.title}
        status={quest.status}
        difficulty={quest.difficulty}
        category={quest.category}
        currentParticipants={quest.currentParticipants}
        maxParticipants={quest.maxParticipants}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Quest Details and Submission */}
        <div className="space-y-6 lg:col-span-2">
          <RequirementsList
            requirements={quest.requirements}
            description={quest.description}
          />
          <SubmissionForm
            questId={quest.id}
            questTitle={quest.title}
            isExpired={isExpired}
            isFull={isFull}
            onSubmit={handleSubmission}
          />
        </div>

        {/* Right Column - Rewards and Timer */}
        <div className="space-y-6">
          <RewardDisplay
            rewardAmount={Number(quest.rewardAmount) || 0}
            rewardAsset={quest.rewardAsset}
            xpReward={quest.xpReward || 0}
          />

          {hasDeadline && (
            <DeadlineTimer deadline={quest.deadline!} isExpired={isExpired} />
          )}

          {/* Quest Metadata */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Quest Information
            </h3>

            {/*
              ── Date formatting changes ─────────────────────────────────────
              Before: new Date(x).toLocaleDateString('en-US', { ... })
                → Hardcoded 'en-US' locale — every user sees English dates
                  regardless of their browser language.
                → toLocaleDateString with hour/minute is inconsistent across
                  browsers for the deadline field.

              After: date(x, 'medium') and date(x, 'datetime')
                → Uses navigator.language via useFormatter — each user sees
                  dates formatted in their own locale and script.
                → 'datetime' style includes both date and time consistently.
              ───────────────────────────────────────────────────────────────
            */}
            <dl className="space-y-3" aria-label="Quest information details">
              <div>
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {quest.createdAt ? date(quest.createdAt, 'medium') : 'N/A'}
                </dd>
              </div>

              {quest.deadline && (
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                    Deadline
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {date(quest.deadline, 'datetime')}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {quest.updatedAt ? date(quest.updatedAt, 'medium') : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
