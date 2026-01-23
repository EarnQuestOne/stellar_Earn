'use client';

import { useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusFilter } from '@/components/submission/StatusFilter';
import { SubmissionSearch } from '@/components/submission/SubmissionSearch';
import { SubmissionSummaryCards } from '@/components/submission/SubmissionSummaryCards';
import { SubmissionsTable } from '@/components/submission/SubmissionsTable';
import { SubmissionDetail } from '@/components/submission/SubmissionDetail';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { SubmissionForm } from '@/components/quest/SubmissionForm';
import { mockSubmissions } from '@/lib/mock/submissions';
import { SubmissionStatus } from '@/lib/types/submission';
import type { Submission } from '@/lib/types/submission';

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmissionFormOpen, setIsSubmissionFormOpen] = useState(false);

  // Get status filter from URL params
  const statusParam = searchParams.get('status');
  const statusFilter =
    statusParam &&
    Object.values(SubmissionStatus).includes(statusParam as SubmissionStatus)
      ? (statusParam as SubmissionStatus)
      : undefined;

  // Get page from URL params
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = 10;

  // Filter submissions based on status and search query
  const filteredSubmissions = useMemo(() => {
    let filtered = [...mockSubmissions];

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.id.toLowerCase().includes(query) ||
          s.quest.title.toLowerCase().includes(query) ||
          s.quest.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [statusFilter, searchQuery]);

  // Paginate results
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * limit;
    const end = start + limit;
    return filteredSubmissions.slice(start, end);
  }, [filteredSubmissions, currentPage, limit]);

  const totalPages = Math.ceil(filteredSubmissions.length / limit);
  const hasMore = currentPage < totalPages;

  // Update URL when filter changes
  const handleStatusChange = (status: SubmissionStatus | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1'); // Reset to first page when filter changes
    router.push(`/submissions?${params.toString()}`);
  };

  // Update URL when page changes
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/submissions?${params.toString()}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset to first page on search
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    router.push(`/submissions?${params.toString()}`);
  };

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Clear selected submission after animation
    setTimeout(() => setSelectedSubmission(null), 300);
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Submissions
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Track your quest submissions and proof of completion.
            </p>
          </div>
          <button
            onClick={() => setIsSubmissionFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#089ec3] px-4 py-2 font-medium text-white hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Submission
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-4 lg:mb-6">
          <SubmissionSummaryCards submissions={mockSubmissions} />
        </div>

        {/* Search and Filter Section - Same Line */}
        <div className="mb-4 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 lg:mb-6 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1 lg:max-w-md">
            <SubmissionSearch onSearch={handleSearch} />
          </div>
          <div className="shrink-0">
            <StatusFilter
              selectedStatus={statusFilter}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>

        {/* Submissions Table */}
        <div className="mb-6">
          {paginatedSubmissions.length > 0 ? (
            <SubmissionsTable
              submissions={paginatedSubmissions}
              onSubmissionClick={handleSubmissionClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <svg
                className="h-12 w-12 text-zinc-400 dark:text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                No submissions found
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? 'Try adjusting your search or filter criteria.'
                  : "You haven't submitted any quests yet."}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasMore={hasMore}
            onPageChange={handlePageChange}
            isLoading={false}
          />
        )}

        {/* Submission Detail Modal */}
        <SubmissionDetail
          submission={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />

        {/* New Submission Form Modal - For Testing */}
        <Modal
          isOpen={isSubmissionFormOpen}
          onClose={() => setIsSubmissionFormOpen(false)}
          title="Submit Proof"
          size="lg"
        >
          <SubmissionForm
            questId="test-quest-123"
            questTitle="Test Quest - Complete a Smart Contract Tutorial"
            onClose={() => setIsSubmissionFormOpen(false)}
            onSuccess={() => {
              console.log('Submission successful!');
              setIsSubmissionFormOpen(false);
            }}
          />
        </Modal>
      </div>
    </AppLayout>
  );
}

export default function SubmissionsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  Submissions
                </h1>
              </div>
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-lg bg-zinc-200 dark:bg-zinc-800"
                  />
                ))}
              </div>
            </div>
          </AppLayout>
      }
    >
      <SubmissionsContent />
    </Suspense>
  );
}
