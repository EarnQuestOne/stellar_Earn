import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestTable } from '../QuestTable';
import type { Quest } from '@/lib/types/admin';

const QuestRowActionsMock = vi.hoisted(() => ({
  QuestRowActions: vi.fn((_props: { quest: Quest }) => (
    <div data-testid="row-actions" />
  )),
}));

vi.mock('../QuestRowActions', () => ({
  QuestRowActions: QuestRowActionsMock.QuestRowActions,
}));

function makeQuests(count: number): Quest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i}`,
    title: `Quest ${i}`,
    description: `Description ${i}`,
    shortDescription: `Short ${i}`,
    category: 'Development',
    difficulty: 'beginner',
    status: 'active',
    reward: 100,
    xpReward: 50,
    deadline: '2025-12-31T23:59:59Z',
    maxParticipants: 100,
    currentParticipants: 10,
    requirements: ['req'],
    tags: ['tag'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
  }));
}

describe('QuestTable row memoization', () => {
  const quests = makeQuests(3);
  const stableCallbacks = {
    onSort: vi.fn(),
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not re-render untouched rows when the selection changes', () => {
    const { rerender } = render(
      <QuestTable
        quests={quests}
        isLoading={false}
        selectedQuests={new Set<string>()}
        sortField="deadline"
        sortOrder="asc"
        allSelected={false}
        {...stableCallbacks}
      />
    );

    const callsAfterMount =
      QuestRowActionsMock.QuestRowActions.mock.calls.length;
    expect(callsAfterMount).toBe(3);

    rerender(
      <QuestTable
        quests={quests}
        isLoading={false}
        selectedQuests={new Set<string>(['q-1'])}
        sortField="deadline"
        sortOrder="asc"
        allSelected={false}
        {...stableCallbacks}
      />
    );

    const newCalls =
      QuestRowActionsMock.QuestRowActions.mock.calls.slice(callsAfterMount);
    expect(newCalls).toHaveLength(1);
    expect(newCalls[0][0].quest.id).toBe('q-1');
  });

  it('re-renders all rows when the callback identities change', () => {
    const { rerender } = render(
      <QuestTable
        quests={quests}
        isLoading={false}
        selectedQuests={new Set<string>()}
        sortField="deadline"
        sortOrder="asc"
        allSelected={false}
        {...stableCallbacks}
      />
    );

    const callsAfterMount =
      QuestRowActionsMock.QuestRowActions.mock.calls.length;

    rerender(
      <QuestTable
        quests={quests}
        isLoading={false}
        selectedQuests={new Set<string>()}
        sortField="deadline"
        sortOrder="asc"
        allSelected={false}
        onSort={vi.fn()}
        onToggleSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onClearSelection={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const newCalls =
      QuestRowActionsMock.QuestRowActions.mock.calls.slice(callsAfterMount);
    expect(newCalls).toHaveLength(3);
  });
});
