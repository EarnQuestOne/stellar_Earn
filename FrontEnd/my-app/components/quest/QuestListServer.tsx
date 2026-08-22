import { getQuestsServer } from '@/lib/server/questsServer';
import type { QuestQueryParams } from '@/lib/types/api.types';

interface QuestListServerProps {
  params?: QuestQueryParams;
}

/**
 * Server Component that fetches quests on the server and renders them without
 * shipping any fetching logic to the browser. Drop it inside a `<Suspense>`
 * boundary (with a skeleton fallback) to stream the list into the page:
 *
 * ```tsx
 * <Suspense fallback={<QuestsLoading />}>
 *   <QuestListServer params={{ page: 1, limit: 12 }} />
 * </Suspense>
 * ```
 */
export async function QuestListServer({ params }: QuestListServerProps) {
  const { quests } = await getQuestsServer(params);

  if (quests.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No quests found.
      </p>
    );
  }

  return (
    <ul
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      aria-label={`${quests.length} quests`}
    >
      {quests.map((quest) => (
        <li
          key={quest.id}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {quest.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {quest.description}
          </p>
          <p className="mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {quest.rewardAmount} {quest.rewardAsset}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default QuestListServer;
