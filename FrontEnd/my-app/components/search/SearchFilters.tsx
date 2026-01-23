'use client';

import type { SearchFilters as SearchFiltersType } from '@/lib/api/search';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onChange: (filters: SearchFiltersType) => void;
}

const filterOptions = [
  { value: 'all', label: 'All', icon: '🔍' },
  { value: 'quest', label: 'Quests', icon: '📋' },
  { value: 'user', label: 'Users', icon: '👤' },
  { value: 'submission', label: 'Submissions', icon: '✅' },
] as const;

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const handleFilterChange = (type: 'quest' | 'user' | 'submission' | 'all') => {
    onChange({ ...filters, type });
  };

  return (
    <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex gap-2" role="tablist" aria-label="Search filters">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.type === option.value
                ? 'bg-[#089ec3] text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
            }`}
            role="tab"
            aria-selected={filters.type === option.value}
            aria-label={`Filter by ${option.label}`}
          >
            <span className="mr-1">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
