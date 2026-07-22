import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QuestDifficulty, QuestStatus } from '@/lib/types/quest';
import { FilterPanel } from './FilterPanel';

const noop = () => undefined;

describe('FilterPanel keyboard navigation', () => {
  test('moves focus across category filters with arrow keys', () => {
    render(
      <FilterPanel
        selectedStatus={QuestStatus.ACTIVE}
        selectedDifficulty={QuestDifficulty.EASY}
        selectedCategory={undefined}
        onStatusChange={noop}
        onDifficultyChange={noop}
        onCategoryChange={noop}
        onClearFilters={noop}
      />
    );

    const categoryGroup = screen.getByRole('group', {
      name: /filter by category/i,
    });
    const categoryButtons = within(categoryGroup).getAllByRole('button');

    categoryButtons[0].focus();
    expect(categoryButtons[0]).toHaveFocus();

    fireEvent.keyDown(categoryButtons[0], { key: 'ArrowRight' });

    expect(categoryButtons[1]).toHaveFocus();
  });
});
