import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestFilters } from '../QuestFilters';
import type { QuestFiltersProps } from '../QuestFilters';

describe('QuestFilters', () => {
  const defaultProps: QuestFiltersProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    statusFilter: 'all',
    onStatusFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input and status filter', () => {
    render(<QuestFilters {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search quests...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    render(<QuestFilters {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search quests...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('calls onStatusFilterChange when selecting a status', () => {
    render(<QuestFilters {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'active' } });

    expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith('active');
  });

  it('shows New Quest link by default', () => {
    render(<QuestFilters {...defaultProps} />);

    expect(screen.getByText('New Quest')).toBeInTheDocument();
  });

  it('hides New Quest link when showNewQuestLink is false', () => {
    render(<QuestFilters {...defaultProps} showNewQuestLink={false} />);

    expect(screen.queryByText('New Quest')).not.toBeInTheDocument();
  });

  it('displays current search query value', () => {
    render(<QuestFilters {...defaultProps} searchQuery="robotics" />);

    const input = screen.getByPlaceholderText('Search quests...') as HTMLInputElement;
    expect(input.value).toBe('robotics');
  });

  it('displays current status filter value', () => {
    render(<QuestFilters {...defaultProps} statusFilter="active" />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('active');
  });
});
