import { useState } from 'react';
import type { Quest } from '@/lib/types/quest';

export type FilterTab = 'Trending' | 'High Reward' | 'New' | 'Ending Soon';

export function useQuestFilter(quests: Quest[]) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Trending');

  return {
    filtered: quests,  
    activeFilter,
    setActiveFilter,
  };
}