'use client';

export function QuestCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Tags */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Title */}
      <div className="mb-2 space-y-2">
        <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Description */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Rewards */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* View Quest Link */}
      <div className="flex justify-end">
        <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
