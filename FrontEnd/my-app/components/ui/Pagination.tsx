'use client';

/**
 * Props for the pagination control used across lists and discovery screens.
 */
interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

/**
 * Displays either page navigation or a load-more button depending on pagination mode.
 */
export function Pagination({
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  onLoadMore,
  isLoading = false,
}: PaginationProps) {
  // If using cursor-based pagination (no totalPages), show Load More button
  if (!totalPages && hasMore && onLoadMore) {
    return (
      <div className="flex justify-center pt-6">
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed dark:bg-primary dark:hover:bg-primary"
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    );
  }

  // If using offset-based pagination with totalPages
  if (totalPages && totalPages > 1) {
    const pages = [];
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <nav
        className="flex items-center justify-center gap-2 pt-6"
        aria-label="Pagination"
      >
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Previous page"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="px-2 text-zinc-500 dark:text-zinc-400">...</span>
            )}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className={`rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              page === currentPage
                ? 'bg-primary text-white dark:bg-primary'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-zinc-500 dark:text-zinc-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Next page"
        >
          Next
        </button>
      </nav>
    );
  }

  // No pagination needed
  return null;
}
