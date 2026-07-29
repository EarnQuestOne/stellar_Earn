export default function AdminQuestsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-9 w-52 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Admin quest table skeleton */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
