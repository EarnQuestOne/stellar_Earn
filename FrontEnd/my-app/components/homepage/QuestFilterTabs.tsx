'use client';

import type { FilterTab } from '@/lib/hooks/useQuestFilter';

interface QuestFilterTabsProps {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}

const TABS: FilterTab[] = ['Trending', 'High Reward', 'New', 'Ending Soon'];

export function QuestFilterTabs({ active, onChange }: QuestFilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter quests"
      className="quest-filter-tabs"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={tab === active}
          onClick={() => onChange(tab)}
          className={`quest-filter-tab ${tab === active ? 'quest-filter-tab--active' : ''}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}