"use client";

import { useState, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterPanel } from "@/components/quest/FilterPanel";
import { QuestList } from "@/components/quest/QuestList";
import { Pagination } from "@/components/ui/Pagination";
import { mockQuests } from "@/lib/mock/quests";
import { QuestStatus, QuestDifficulty } from "@/lib/types/quest";
import type { Quest } from "@/lib/types/quest";
import { AppLayout } from "@/components/layout/AppLayout";

function QuestsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Get filters from URL params
  const statusParam = searchParams.get("status");
  const statusFilter =
    statusParam &&
    Object.values(QuestStatus).includes(statusParam as QuestStatus)
      ? (statusParam as QuestStatus)
      : undefined;

  const difficultyParam = searchParams.get("difficulty");
  const difficultyFilter =
    difficultyParam &&
    Object.values(QuestDifficulty).includes(difficultyParam as QuestDifficulty)
      ? (difficultyParam as QuestDifficulty)
      : undefined;

  const categoryParam = searchParams.get("category");
  const categoryFilter = categoryParam || undefined;

  // Get page from URL params
  const pageParam = searchParams.get("page");
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = 12;

  // Filter quests based on all criteria
  const filteredQuests = useMemo(() => {
    let filtered = [...mockQuests];

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((q) => q.status === statusFilter);
    }

    // Filter by difficulty
    if (difficultyFilter) {
      filtered = filtered.filter((q) => q.difficulty === difficultyFilter);
    }

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [statusFilter, difficultyFilter, categoryFilter, searchQuery]);

  // Paginate results
  const paginatedQuests = useMemo(() => {
    const start = (currentPage - 1) * limit;
    const end = start + limit;
    return filteredQuests.slice(start, end);
  }, [filteredQuests, currentPage, limit]);

  const totalPages = Math.ceil(filteredQuests.length / limit);
  const hasMore = currentPage < totalPages;
  const hasActiveFilters = !!(
    statusFilter ||
    difficultyFilter ||
    categoryFilter ||
    searchQuery
  );

  // Update URL when filters change
  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set("page", "1"); // Reset to first page when filters change
    router.push(`/quests?${params.toString()}`);
  };

  const handleStatusChange = (status: QuestStatus | undefined) => {
    updateURL({ status: status || null });
  };

  const handleDifficultyChange = (difficulty: QuestDifficulty | undefined) => {
    updateURL({ difficulty: difficulty || null });
  };

  const handleCategoryChange = (category: string | undefined) => {
    updateURL({ category: category || null });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateURL({ search: query || null });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    router.push("/quests");
  };

  // Update URL when page changes
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/quests?${params.toString()}`);
  };

  const handleQuestClick = (quest: Quest) => {
    // TODO: Navigate to quest detail page
    console.log("View quest:", quest.id);
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header content */}
        <div className="mb-6 flex items-center justify-between lg:mb-8">
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
            className="flex items-center gap-2 rounded-lg bg-[#089ec3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:bg-[#089ec3] dark:hover:bg-[#0ab8d4]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className=" lg:max-w-md">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search quests..."
              defaultValue={searchQuery}
            />
          </div>
          <FilterPanel
            selectedStatus={statusFilter}
            selectedDifficulty={difficultyFilter}
            selectedCategory={categoryFilter}
            onStatusChange={handleStatusChange}
            onDifficultyChange={handleDifficultyChange}
            onCategoryChange={handleCategoryChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Quest List */}
        <div className="mb-6">
          <QuestList
            quests={paginatedQuests}
            isLoading={false}
            error={null}
            onQuestClick={handleQuestClick}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Pagination logic */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasMore={hasMore}
            onPageChange={handlePageChange}
            isLoading={false}
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
        <div className="flex h-screen bg-white dark:bg-zinc-900">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  Quest Board
                </h1>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800"
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      }
    >
      <QuestsContent />
    </Suspense>
  );
}
