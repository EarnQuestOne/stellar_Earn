'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { QuestDetail } from '@/components/quest/QuestDetail';
import { SubmissionForm } from '@/components/submission/SubmissionForm';
import { OfflineIndicator } from '@/components/quest/OfflineIndicator';
import { RetryButton } from '@/components/quest/RetryButton';
import { getQuestById } from '@/lib/api/quests';
import type { Quest } from '@/lib/types/quest';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { Skeleton } from '@/components/ui/Skeleton';

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;
  const { isOnline } = useOnlineStatus();

  const [quest, setQuest] = useState<Quest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { trackEvent } = useAnalytics();

  const fetchQuest = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getQuestById(questId);
      setQuest(data as unknown as Quest);
      trackEvent(ANALYTICS_EVENTS.QUEST_VIEW, { questId });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch quest'));
    } finally {
      setIsLoading(false);
    }
  }, [questId, trackEvent]);

  useEffect(() => {
    if (questId) {
      fetchQuest();
    }
  }, [questId, fetchQuest]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await fetchQuest();
    } finally {
      setIsRetrying(false);
    }
  }, [fetchQuest]);

  if (isLoading) {
    return (
      <AppLayout>
        {/* Offline Indicator */}
        <OfflineIndicator isOffline={!isOnline} />

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <Skeleton.Text className="h-6 w-32" />
          </div>

          {/* Header Skeleton */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex gap-2">
              <Skeleton.Text className="h-6 w-20 rounded-full" />
              <Skeleton.Text className="h-6 w-24 rounded-full" />
              <Skeleton.Text className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton.Text className="mb-4 h-10 w-3/4" />
            <Skeleton.Text className="h-5 w-48" />
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton.Card rows={5} />
              <Skeleton.Card rows={8} />
            </div>
            <div className="space-y-6">
              <Skeleton.Card rows={4} />
              <Skeleton.Card rows={3} />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        {/* Offline Indicator */}
        <OfflineIndicator isOffline={!isOnline} />

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/quests"
            className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Quests
          </Link>

          {/* Error State */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-900/10">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
              Quest Not Found
            </h3>
            <p className="mb-4 text-sm text-red-700 dark:text-red-300">
              {error.message || 'The quest you are looking for does not exist.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push('/quests')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-offset-zinc-900"
              >
                Return to Quest Board
              </button>
              <RetryButton
                isVisible={true}
                isLoading={isRetrying}
                onRetry={handleRetry}
                buttonText="Retry"
              />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!quest) {
    return null;
  }

  return (
    <AppLayout>
      {/* Offline Indicator */}
      <OfflineIndicator isOffline={!isOnline} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/quests"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Quests
        </Link>

        {/* Quest Detail Component */}
        <QuestDetail quest={quest} />

        {/* Submission Form */}
        <div className="mt-6">
          <SubmissionForm
            questId={quest.id}
            questTitle={quest.title}
            isExpired={
              quest.status === 'Expired' ||
              (quest.deadline != null && new Date(quest.deadline) < new Date())
            }
            isFull={
              quest.maxParticipants != null &&
              quest.currentParticipants != null &&
              quest.currentParticipants >= quest.maxParticipants
            }
          />
        </div>
      </div>
    </AppLayout>
  );
}
