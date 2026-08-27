import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyQuestState } from './EmptyQuestState';

describe('EmptyQuestState', () => {
  it('renders the illustration, heading and default copy', () => {
    render(<EmptyQuestState />);

    expect(
      screen.getByRole('heading', { name: /no quests found/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'There are no quests available at the moment. Check back later!'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('No quests found')).toBeInTheDocument();
  });

  it('renders a decorative illustration hidden from assistive tech', () => {
    const { container } = render(<EmptyQuestState />);

    const illustration = container.querySelector('svg[aria-hidden="true"]');
    expect(illustration).not.toBeNull();
    expect(illustration).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows filter-aware copy when active filters are applied', () => {
    render(<EmptyQuestState hasActiveFilters={true} />);

    expect(
      screen.getByText(
        'Try adjusting your search or filter criteria to find more quests.'
      )
    ).toBeInTheDocument();
  });

  it('renders the clear filters button and triggers onClearFilters', () => {
    const onClearFilters = vi.fn();
    render(
      <EmptyQuestState hasActiveFilters={true} onClearFilters={onClearFilters} />
    );

    const button = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(button);

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('does not render the clear filters button without a callback', () => {
    render(<EmptyQuestState hasActiveFilters={true} />);

    expect(
      screen.queryByRole('button', { name: /clear filters/i })
    ).not.toBeInTheDocument();
  });

  it('does not render a clear filters button when no filters are active', () => {
    const onClearFilters = vi.fn();
    render(<EmptyQuestState onClearFilters={onClearFilters} />);

    expect(
      screen.queryByRole('button', { name: /clear filters/i })
    ).not.toBeInTheDocument();
    expect(onClearFilters).not.toHaveBeenCalled();
  });
});