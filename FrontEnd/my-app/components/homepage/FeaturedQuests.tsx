'use client';

import { useEffect, useState, useRef } from 'react';
import type { Quest } from '@/lib/types/quest';
import type { QuestQueryParams } from '@/lib/types/api.types';
import { getQuests } from '@/lib/api/quests';
import { createCancelToken } from '@/lib/api/client';
import { useQuestFilter } from '@/lib/hooks/useQuestFilter';
import type { FilterTab } from '@/lib/hooks/useQuestFilter';
import { QuestFilterTabs } from './QuestFilterTabs';
import { QuestCarousel } from './QuestCarousel';

const TAB_PARAMS: Record<FilterTab, QuestQueryParams> = {
  'Trending':    { sortBy: 'xpReward',     order: 'DESC', limit: 10 },
  'High Reward': { sortBy: 'rewardAmount', order: 'DESC', limit: 10 },
  'New':         { sortBy: 'createdAt',    order: 'DESC', limit: 10 },
  'Ending Soon': { sortBy: 'deadline',     order: 'ASC',  limit: 10 },
};

export default function FeaturedQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { activeFilter, setActiveFilter } = useQuestFilter(quests);
  const cancelRef = useRef(createCancelToken());

  useEffect(() => {
    cancelRef.current.cancel();
    cancelRef.current = createCancelToken();
    setLoading(true);
    setError(null);

    getQuests(TAB_PARAMS[activeFilter], cancelRef.current)
      .then((res) => {
        const items = (res as any).data ?? (res as any).quests ?? [];
        setQuests(items);
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        setError(err?.message ?? 'Failed to load quests.');
      })
      .finally(() => setLoading(false));

    return () => { cancelRef.current.cancel(); };
  }, [activeFilter]);

  return (
    <section className="featured-quests" aria-labelledby="featured-quests-heading">
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
        <a href="/quests" className="featured-quests__view-all">View all quests →</a>
      </div>

      <QuestFilterTabs active={activeFilter} onChange={setActiveFilter} />

      {loading && (
        <div className="carousel-skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="carousel-skeleton__card" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="featured-quests__error">Could not load quests — {error}</p>
      )}

      {!loading && !error && <QuestCarousel quests={quests} />}
    </section>
  );
}