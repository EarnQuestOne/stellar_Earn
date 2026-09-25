import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';

import { QuestTable } from '@/components/admin/QuestTable';
import type { Quest, QuestStatus } from '@/lib/types/admin';

const STATUSES: QuestStatus[] = [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
];
const CATEGORIES = [
  'Development',
  'Blockchain',
  'Documentation',
  'Design',
  'Testing',
  'Community',
] as const;

function makeQuests(n: number): Quest[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    title: `Quest ${i} long title to exercise realistic row width`,
    description: `Description for quest ${i}`,
    shortDescription: `Short ${i}`,
    category: CATEGORIES[i % CATEGORIES.length],
    difficulty: ['beginner', 'intermediate', 'advanced', 'expert'][i % 4] as
      | 'beginner'
      | 'intermediate'
      | 'advanced'
      | 'expert',
    status: STATUSES[i % STATUSES.length],
    reward: (i % 50) * 10,
    xpReward: (i % 20) * 5,
    deadline: new Date(Date.UTC(2026, 0, (i % 28) + 1)).toISOString(),
    maxParticipants: 100,
    currentParticipants: i % 100,
    requirements: ['req'],
    tags: ['tag'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: 'bench',
  }));
}

function renderTable(quests: Quest[], selected: Set<string>) {
  return render(<QuestTable {...questTableProps(quests, selected)} />);
}

function questTableProps(quests: Quest[], selected: Set<string>) {
  return {
    quests,
    isLoading: false,
    selectedQuests: selected,
    sortField: 'deadline' as const,
    sortOrder: 'asc' as const,
    allSelected: false,
    onSort: () => {},
    onToggleSelect: () => {},
    onSelectAll: () => {},
    onClearSelection: () => {},
    onDelete: () => {},
  };
}

const SIZES = [200, 1000];
const ITERATIONS = 3;

describe('QuestTable render benchmark', () => {
  it('measures mount + selection-update cost per dataset size', () => {
    const results = SIZES.map((n) => {
      const quests = makeQuests(n);
      let mountBest = Infinity;
      let updateBest = Infinity;
      let renderedRows = 0;

      for (let i = 0; i < ITERATIONS; i++) {
        const startMount = performance.now();
        const { container, rerender, unmount } = renderTable(
          quests,
          new Set<string>()
        );
        const mountMs = performance.now() - startMount;

        // Simulate a user toggling one checkbox: re-render with a new
        // selection. Rows whose selection did not change should not re-render.
        const startUpdate = performance.now();
        rerender(
          <QuestTable {...questTableProps(quests, new Set<string>(['q-5']))} />
        );
        const updateMs = performance.now() - startUpdate;

        renderedRows = container.querySelectorAll('tbody tr').length;
        unmount();

        mountBest = Math.min(mountBest, mountMs);
        updateBest = Math.min(updateBest, updateMs);
      }

      return {
        n,
        mountMs: round(mountBest),
        updateMs: round(updateBest),
        renderedRows,
      };
    });

    const outPath =
      process.env.QUEST_TABLE_BENCH_OUT ||
      resolve(__dirname, 'results', 'quest-table.latest.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          label: process.env.QUEST_TABLE_BENCH_LABEL || 'latest',
          generatedAt: new Date().toISOString(),
          iterations: ITERATIONS,
          results,
        },
        null,
        2
      )
    );
  });
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
