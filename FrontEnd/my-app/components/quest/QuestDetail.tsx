'use client';

import { QuestHeader } from './QuestHeader';
import { RequirementsList } from './RequirementsList';
import { RewardDisplay } from './RewardDisplay';
import { DeadlineTimer } from './DeadlineTimer';
import { SubmissionForm } from './SubmissionForm';
import type { Quest } from '@/lib/types/quest';
import { QuestStatus } from '@/lib/types/quest';

interface QuestDetailProps {
  quest: Quest;
}

export function QuestDetail({ quest }: QuestDetailProps) {
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
          {/* Requirements */}
          <RequirementsList
            requirements={quest.requirements}
            description={quest.description}
          />

          {/* Submission Form */}
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
          {/* Reward Display */}
          <RewardDisplay
            rewardAmount={quest.rewardAmount}
            rewardAsset={quest.rewardAsset}
            xpReward={quest.xpReward}
          />

          {/* Deadline Timer */}
          {hasDeadline && (
            <DeadlineTimer deadline={quest.deadline!} isExpired={isExpired} />
          )}

          {/* Quest Metadata */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Quest Information
            </h3>
            <dl className="space-y-3" aria-label="Quest information details">
              <div>
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {quest.createdAt
                    ? new Date(quest.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </dd>
              </div>
              {quest.deadline && (
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                    Deadline
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {quest.deadline
                      ? new Date(quest.deadline).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'No deadline'}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {quest.updatedAt
                    ? new Date(quest.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
