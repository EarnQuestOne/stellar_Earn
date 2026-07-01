'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Quest } from '@/lib/types/quest';
import type { QuestQueryParams } from '@/lib/types/api.types';
import { getQuests } from '@/lib/api/quests';
import { createCancelToken } from '@/lib/api/client';
import { useQuestFilter } from '@/lib/hooks/useQuestFilter';
import type { FilterTab } from '@/lib/hooks/useQuestFilter';
import { QuestFilterTabs } from './QuestFilterTabs';
import { QuestCarousel } from './QuestCarousel';
import { FeaturedQuestsSkeleton } from './SkeletonLoaders';
import { APIBootstrapErrorBoundary } from '@/components/error/APIBootstrapErrorBoundary';
import { BootstrapErrorFallback } from '@/components/error/BootstrapErrorFallback';

import { AppError, ERROR_CODES } from '@/lib/utils/error-handler';

const TAB_PARAMS: Record<FilterTab, QuestQueryParams> = {
  Trending: { sortBy: 'xpReward', order: 'DESC', limit: 10 },
  'High Reward': { sortBy: 'rewardAmount', order: 'DESC', limit: 10 },
  New: { sortBy: 'createdAt', order: 'DESC', limit: 10 },
  'Ending Soon': { sortBy: 'deadline', order: 'ASC', limit: 10 },
};

/**
 * Internal component that handles the quest data fetching and display.
 * Uses improved error handling with retry logic and better error states.
 */
function FeaturedQuestsContent() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetry, setAutoRetry] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isExtendedTimeout, setIsExtendedTimeout] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const { activeFilter, setActiveFilter } = useQuestFilter(quests);
  const cancelRef = useRef(createCancelToken());

  /**
   * Fetch quests with improved error handling
   */
  const fetchQuests = useCallback(
    async (customTimeout?: number) => {
      cancelRef.current.cancel();
      cancelRef.current = createCancelToken();
      setLoading(true);
      setError(null);

      try {
        const res = await getQuests(
          TAB_PARAMS[activeFilter],
          cancelRef.current,
          customTimeout,
          {
            onRevalidate: (fresh) => {
              setQuests(fresh.data);
            },
          }
        );
        setQuests(res.data);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        // Don't show error if request was cancelled (e.g., component unmounting)
        if (err && typeof err === 'object' && 'name' in err) {
          const errorName = (err as any).name;
          if (errorName === 'CanceledError' || errorName === 'AbortError') {
            return;
          }
        }

        const appError = err as AppError;
        setError(appError);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter]
  );

  /**
   * Handle manual retry from error UI
   */
  const handleRetry = useCallback(
    async (useExtended: boolean = false) => {
      setRetryCount((prev) => prev + 1);
      setCountdown(5); // Reset countdown
      setIsExtendedTimeout(useExtended);
      await fetchQuests(useExtended ? 60000 : undefined);
    },
    [fetchQuests]
  );

  /**
   * Auto-retry countdown effect
   */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const isTimeout =
      error &&
      (error.code === ERROR_CODES.TIMEOUT_ERROR ||
        error.message?.toLowerCase().includes('timeout'));

    if (isTimeout && autoRetry && countdown > 0 && !loading) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isTimeout && autoRetry && countdown === 0 && !loading) {
      handleRetry(isExtendedTimeout);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error, autoRetry, countdown, loading, isExtendedTimeout, handleRetry]);

  /**
   * Fetch quests when filter changes
   */
  useEffect(() => {
    setIsExtendedTimeout(false);
    fetchQuests();

    return () => {
      cancelRef.current.cancel();
    };
  }, [activeFilter, fetchQuests]);

  // Loading state - show skeleton
  if (loading && quests.length === 0) {
    return (
      <section
        className="featured-quests"
        aria-labelledby="featured-quests-heading"
      >
        <div className="featured-quests__header">
          <div>
            <p className="featured-quests__eyebrow">Featured Opportunities</p>
            <h2
              id="featured-quests-heading"
              className="featured-quests__heading"
            >
              Top Quests Right Now
            </h2>
            <p className="featured-quests__subtext">
              Hand-picked high-value tasks with on-chain rewards.
            </p>
          </div>
          <a href="/quests" className="featured-quests__view-all">
            View all quests →
          </a>
        </div>
        <FeaturedQuestsSkeleton />
      </section>
    );
  }

  // Error state - show error message with retry
  if (error && !loading) {
    const isTimeout =
      error.code === ERROR_CODES.TIMEOUT_ERROR ||
      error.message?.toLowerCase().includes('timeout');

    return (
      <section
        className="featured-quests"
        aria-labelledby="featured-quests-heading"
      >
        <div className="featured-quests__header">
          <div>
            <p className="featured-quests__eyebrow">Featured Opportunities</p>
            <h2
              id="featured-quests-heading"
              className="featured-quests__heading"
            >
              Top Quests Right Now
            </h2>
            <p className="featured-quests__subtext">
              Hand-picked high-value tasks with on-chain rewards.
            </p>
          </div>
          <a href="/quests" className="featured-quests__view-all">
            View all quests →
          </a>
        </div>

        {isTimeout ? (
          <div
            className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-amber-900/10 to-zinc-900/40 p-6 shadow-lg shadow-amber-950/10 backdrop-blur-md transition-all duration-300"
            role="alert"
            data-testid="timeout-error-container"
          >
            <div className="flex flex-col md:flex-row items-start gap-5">
              {/* Animated Clock / Pulsing Radar Icon */}
              <div className="flex flex-shrink-0 items-center justify-center rounded-xl bg-amber-900/30 p-4 border border-amber-500/20 shadow-inner relative overflow-hidden group">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/10 opacity-75 animate-ping" />
                <svg
                  className="h-8 w-8 text-amber-400 relative z-10 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Error Information */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-amber-200 tracking-tight">
                    Unable to Load Quests
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    Request Timed Out
                  </span>
                </div>

                <p className="mt-3 text-sm text-amber-300/95 leading-relaxed">
                  The request took longer than the standard 30-second limit.
                  This usually happens when your internet connection is slow or
                  the quest server is temporarily overloaded.
                </p>

                {/* Countdown Status */}
                {autoRetry && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-300 font-medium">
                    <svg
                      className="h-4 w-4 animate-spin text-amber-400"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>
                      Auto-retrying in{' '}
                      <strong className="text-amber-200">{countdown}s</strong>
                      ...
                    </span>
                  </div>
                )}

                {/* Controls & Actions */}
                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <button
                    onClick={() => handleRetry(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </button>

                  <button
                    onClick={() => handleRetry(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500/30 hover:border-amber-400/50 bg-amber-900/10 hover:bg-amber-900/30 active:bg-amber-900/50 px-5 py-2.5 text-sm font-semibold text-amber-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Retry with Extended Timeout
                  </button>

                  <div className="flex items-center gap-2 px-1 py-2 sm:py-0">
                    <input
                      id="auto-retry-checkbox"
                      type="checkbox"
                      checked={autoRetry}
                      onChange={(e) => {
                        setAutoRetry(e.target.checked);
                        if (e.target.checked) setCountdown(5);
                      }}
                      className="h-4 w-4 rounded border-amber-500/30 bg-zinc-900 text-amber-600 focus:ring-amber-500 focus:ring-offset-zinc-900"
                    />
                    <label
                      htmlFor="auto-retry-checkbox"
                      className="text-sm font-medium text-amber-300 cursor-pointer select-none"
                    >
                      Auto-retry on timeout
                    </label>
                  </div>
                </div>

                {/* Diagnostics & Tips Toggle */}
                <div className="mt-6 border-t border-amber-500/20 pt-4">
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors focus:outline-none"
                  >
                    <svg
                      className={`h-3 w-3 transform transition-transform duration-200 ${showDiagnostics ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span>Network & Diagnosis Tips</span>
                  </button>

                  {showDiagnostics && (
                    <div className="mt-3 rounded-lg bg-amber-950/20 border border-amber-500/10 p-3 text-xs text-amber-300/80 leading-relaxed space-y-2">
                      <p className="font-semibold text-amber-300">
                        Here are a few quick items to check:
                      </p>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        <li>
                          Ensure you are not downloading or streaming
                          high-bandwidth media in parallel.
                        </li>
                        <li>
                          If utilizing a VPN, try pausing it or switching
                          regions to minimize network latency.
                        </li>
                        <li>
                          Check your connection speed using a tool like
                          fast.com.
                        </li>
                        <li>
                          Current request limit:{' '}
                          <span className="font-mono text-amber-200">
                            {isExtendedTimeout ? '60,000ms' : '30,000ms'}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Retry attempts indicator */}
                {retryCount > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>
                      Retry attempts: {retryCount}{' '}
                      {isExtendedTimeout && '(using extended 60s timeout)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg border border-red-900/30 bg-red-900/10 p-6"
            role="alert"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200">
                  Unable to Load Quests
                </h3>
                <p className="mt-2 text-sm text-red-300">{error.message}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleRetry(false)}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </button>

                  <a
                    href="/quests"
                    className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    View All Quests
                  </a>
                </div>

                {retryCount > 0 && (
                  <p className="mt-3 text-xs text-red-400">
                    Retry attempts: {retryCount}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // Success state - show content
  return (
    <section
      className="featured-quests"
      aria-labelledby="featured-quests-heading"
    >
      <div className="featured-quests__header">
        <div>
          <p className="featured-quests__eyebrow">Featured Opportunities</p>
          <h2 id="featured-quests-heading" className="featured-quests__heading">
            Top Quests Right Now
          </h2>
          <p className="featured-quests__subtext">
            Hand-picked high-value tasks with on-chain rewards.
          </p>
        </div>
        <a href="/quests" className="featured-quests__view-all">
          View all quests →
        </a>
      </div>

      <QuestFilterTabs active={activeFilter} onChange={setActiveFilter} />
      <QuestCarousel quests={quests} />
    </section>
  );
}

/**
 * Main component with error boundary wrapper for resilient error handling
 */
export default function FeaturedQuests() {
  return (
    <APIBootstrapErrorBoundary
      componentName="Featured Quests"
      fallback={({ error, resetError, componentName }) => (
        <BootstrapErrorFallback
          error={error}
          resetError={resetError}
          componentName={componentName}
          showDetails={false}
        />
      )}
      onError={(error) => {
        console.error('FeaturedQuests bootstrap error:', error);
      }}
    >
      <FeaturedQuestsContent />
    </APIBootstrapErrorBoundary>
  );
}
