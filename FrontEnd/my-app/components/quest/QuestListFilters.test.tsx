import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestListFilters } from './QuestListFilters';
import { QuestDifficulty, QuestStatus } from '@/lib/types/quest';
import { DEFAULT_FILTER_DEBOUNCE_MS } from '@/lib/hooks/useQuestFilter';

function renderFilters(
  overrides: Partial<React.ComponentProps<typeof QuestListFilters>> = {}
) {
  const onStatusChange = vi.fn();
  const onDifficultyChange = vi.fn();
  const onCategoryChange = vi.fn();
  const onRewardRangeChange = vi.fn();
  const onClearFilters = vi.fn();

  render(
    <QuestListFilters
      onStatusChange={onStatusChange}
      onDifficultyChange={onDifficultyChange}
      onCategoryChange={onCategoryChange}
      onRewardRangeChange={onRewardRangeChange}
      onClearFilters={onClearFilters}
      {...overrides}
    />
  );

  return {
    onStatusChange,
    onDifficultyChange,
    onCategoryChange,
    onRewardRangeChange,
    onClearFilters,
  };
}

function advanceDebounce() {
  act(() => {
    vi.advanceTimersByTime(DEFAULT_FILTER_DEBOUNCE_MS + 1);
  });
}

describe('QuestListFilters debounce (#2499)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('propagates a status change once the debounce window elapses', () => {
    const { onStatusChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: QuestStatus.ACTIVE },
    });

    expect(onStatusChange).not.toHaveBeenCalled();

    advanceDebounce();

    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith(QuestStatus.ACTIVE);
  });

  it('coalesces rapid reward inputs into a single callback', () => {
    const { onRewardRangeChange } = renderFilters();

    const minInput = screen.getByLabelText('Minimum reward in XLM');
    fireEvent.change(minInput, { target: { value: '1' } });
    fireEvent.change(minInput, { target: { value: '10' } });
    fireEvent.change(minInput, { target: { value: '100' } });

    expect(onRewardRangeChange).not.toHaveBeenCalled();

    advanceDebounce();

    expect(onRewardRangeChange).toHaveBeenCalledTimes(1);
    expect(onRewardRangeChange).toHaveBeenCalledWith(100, undefined);
  });

  it('debounces each control independently', () => {
    const { onStatusChange, onDifficultyChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: QuestStatus.ACTIVE },
    });
    fireEvent.change(screen.getByLabelText('Difficulty'), {
      target: { value: QuestDifficulty.HARD },
    });

    advanceDebounce();

    expect(onStatusChange).toHaveBeenCalledWith(QuestStatus.ACTIVE);
    expect(onDifficultyChange).toHaveBeenCalledWith(QuestDifficulty.HARD);
  });

  it('calls onClearFilters immediately', () => {
    const { onClearFilters } = renderFilters({
      selectedStatus: QuestStatus.ACTIVE,
    });

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('only shows the clear button when a filter is active', () => {
    const { onClearFilters } = renderFilters();

    expect(
      screen.queryByRole('button', { name: /clear filters/i })
    ).not.toBeInTheDocument();
    expect(onClearFilters).not.toHaveBeenCalled();
  });
});
