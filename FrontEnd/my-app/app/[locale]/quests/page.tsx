'use client';

import { useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { SearchBar } from '@/components/ui/SearchBar';
import { QuestListFilters } from '@/components/quest/QuestListFilters';
import { QuestList } from '@/components/quest/QuestList';
import { OfflineIndicator } from '@/components/quest/OfflineIndicator';
import { Pagination } from '@/components/ui/Pagination';
import { QuestStatus, QuestDifficulty } from '@/lib/types/quest';
import type { Quest } from '@/lib/types/quest';
import LazyLoad from '@/components/ui/LazyLoad';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useQuests } from '@/lib/hooks/useQuests';

function QuestsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { isOnline } = useOnlineStatus();

  // Derive filter state from URL search params
  const statusParam = searchParams.get('status');
  const statusFilter =
    statusParam &&
    Object.values(QuestStatus).includes(statusParam as QuestStatus)
      ? (statusParam as QuestStatus)
      : undefined;

  const difficultyParam = searchParams.get('difficulty');
  const difficultyFilter =
    difficultyParam &&
    Object.values(QuestDifficulty).includes(difficultyParam as QuestDifficulty)
      ? (difficultyParam as QuestDifficulty)
      : undefined;

  const categoryParam = searchParams.get('category');
  const categoryFilter = categoryParam || undefined;

  const minRewardParam = searchParams.get('minReward');
  const minReward = minRewardParam ? Number(minRewardParam) : undefined;

  const maxRewardParam = searchParams.get('maxReward');
  const maxReward = maxRewardParam ? Number(maxRewardParam) : undefined;

  const searchParam = searchParams.get('search');
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = 12;

  // Wire useQuests hook — filters and pagination are passed to the API
  const { quests, isLoading, error, pagination, refetch } = useQuests(
    {
      status: statusFilter,
      difficulty: difficultyFilter,
      category: categoryFilter,
      search: searchParam ?? searchQuery ?? undefined,
      minReward,
      maxReward,
    },
    { page: currentPage, limit }
  );

  const totalPages = pagination?.totalPages ?? 1;
  const hasMore = pagination?.hasMore ?? false;
  const hasActiveFilters = !!(
    statusFilter ||
    difficultyFilter ||
    categoryFilter ||
    searchQuery ||
    minReward !== undefined ||
    maxReward !== undefined
  );

  // Push filter/pagination updates to URL so state persists across navigation
  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== null && value !== '') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleStatusChange = useCallback(
    (status: QuestStatus | undefined) => {
      updateURL({ status: status ?? null });
    },
    [updateURL]
  );

  const handleDifficultyChange = useCallback(
    (difficulty: QuestDifficulty | undefined) => {
      updateURL({ difficulty: difficulty ?? null });
    },
    [updateURL]
  );

  const handleCategoryChange = useCallback(
    (category: string | undefined) => {
      updateURL({ category: category ?? null });
    },
    [updateURL]
  );

  const handleRewardRangeChange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      updateURL({
        minReward: min !== undefined ? String(min) : null,
        maxReward: max !== undefined ? String(max) : null,
      });
    },
    [updateURL]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      updateURL({ search: query || null });
    },
    [updateURL]
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    router.push('?');
  }, [router]);

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page.toString());
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleQuestClick = useCallback(
    (quest: Quest) => {
      router.push(`/quests/${quest.id}`);
    },
    [router]
  );

  return (
    <AppLayout>
      <OfflineIndicator
        isOffline={!isOnline}
        message="You appear to be offline. Quest data may not load properly."
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="mb-6 flex items-center justify-between lg:mb-8"
          data-onboarding="quest-board-header"
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Quest Board
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Browse available quests and start earning rewards.
            </p>
          </div>
          <Link
            href="/quests/create"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary dark:bg-primary dark:hover:bg-primary"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Quest
          </Link>
        </div>

        {/* Search + Filters */}
        <ComponentErrorBoundary componentName="SearchAndFilters">
          <div
            className="mb-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            data-onboarding="quest-board-filters"
          >
            <div className="lg:max-w-md">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search quests..."
                defaultValue={searchQuery}
              />
            </div>
            <QuestListFilters
              selectedStatus={statusFilter}
              selectedDifficulty={difficultyFilter}
              selectedCategory={categoryFilter}
              minReward={minReward}
              maxReward={maxReward}
              onStatusChange={handleStatusChange}
              onDifficultyChange={handleDifficultyChange}
              onCategoryChange={handleCategoryChange}
              onRewardRangeChange={handleRewardRangeChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </ComponentErrorBoundary>

        {/* Quest List */}
        <ComponentErrorBoundary componentName="QuestList">
          <div className="mb-6" data-onboarding="quest-board-list">
            <LazyLoad>
              <QuestList
                quests={quests as Quest[]}
                isLoading={isLoading}
                error={error}
                onQuestClick={handleQuestClick}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
                onRetry={refetch}
              />
            </LazyLoad>
          </div>
        </ComponentErrorBoundary>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasMore={hasMore}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default function QuestsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 lg:mb-8">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Quest Board
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton.Card key={i} />
              ))}
            </div>
          </div>
        </AppLayout>
      }
    >
      <QuestsContent />
    </Suspense>
  );
}
