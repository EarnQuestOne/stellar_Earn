'use client';

/**
 * Shared props for skeleton placeholder components.
 */
interface SkeletonBaseProps {
  className?: string;
}

/**
 * A skeleton text block used during loading states.
 */
export function SkeletonText({ className = 'h-4 w-full' }: SkeletonBaseProps) {
  return (
    <div
      className={`animate-shimmer rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * A card-style skeleton used while content is loading.
 */
export function SkeletonCard({
  className = '',
  rows = 3,
}: SkeletonBaseProps & { rows?: number }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center justify-between">
        <SkeletonText className="h-10 w-10 rounded-lg" />
        <SkeletonText className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonText
            key={index}
            className={index === rows - 1 ? 'h-4 w-2/3' : 'h-4 w-full'}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A list-style skeleton placeholder for loading collections.
 */
export function SkeletonList({
  className = '',
  items = 3,
}: SkeletonBaseProps & { items?: number }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <SkeletonText className="h-5 w-2/3" />
            <SkeletonText className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <SkeletonText className="h-4 w-full" />
            <SkeletonText className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const Skeleton = {
  Text: SkeletonText,
  Card: SkeletonCard,
  List: SkeletonList,
};
