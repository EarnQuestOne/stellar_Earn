import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestDifficulty, QuestStatus, type Quest } from '@/lib/types/quest';
import { QuestList } from './QuestList';

const baseQuest = (id: string, title: string): Quest => ({
  id,
  contractQuestId: id,
  title,
  description: `${title} description`,
  category: 'Security',
  difficulty: QuestDifficulty.EASY,
  rewardAmount: '100',
  rewardAsset: 'XLM',
  xpReward: 50,
  status: QuestStatus.ACTIVE,
  verifierAddress: 'GTEST000000000000000000000000000000000000',
  requirements: [],
  maxParticipants: 5,
  currentParticipants: 1,
  totalClaims: 0,
  totalSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
  creator: { id: 'creator', name: 'Creator' },
  skills: ['Rust'],
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
});

describe('QuestList keyboard navigation', () => {
  test('moves focus to the next quest card with arrow keys', () => {
    render(
      <QuestList
        quests={[
          baseQuest('quest-1', 'Quest One'),
          baseQuest('quest-2', 'Quest Two'),
        ]}
      />
    );

    const cards = screen.getAllByRole('button');

    cards[0].focus();
    expect(cards[0]).toHaveFocus();

    fireEvent.keyDown(cards[0], { key: 'ArrowDown' });

    expect(cards[1]).toHaveFocus();
  });
});

describe('QuestList empty state', () => {
  test('shows the illustrated empty state when there are no quests', () => {
    const { container } = render(<QuestList quests={[]} />);

    expect(
      screen.getByRole('heading', { name: /no quests found/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      container.querySelector('svg[aria-hidden="true"]')
    ).not.toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  test('shows the empty state with active-filter copy and clear action', () => {
    const onClearFilters = vi.fn();
    render(
      <QuestList
        quests={[]}
        hasActiveFilters={true}
        onClearFilters={onClearFilters}
      />
    );

    expect(
      screen.getByText(
        'Try adjusting your search or filter criteria to find more quests.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test('does not show the empty state while loading', () => {
    render(<QuestList quests={[]} isLoading={true} />);

    expect(
      screen.queryByRole('heading', { name: /no quests found/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading quests/i })).toBeInTheDocument();
  });

  test('does not show the empty state when an error occurs', () => {
    render(<QuestList quests={[]} error={new Error('boom')} />);

    expect(
      screen.queryByRole('heading', { name: /no quests found/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /error loading quests/i })
    ).toBeInTheDocument();
  });
});
