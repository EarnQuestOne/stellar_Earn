import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestTable } from '../QuestTable';
import type { QuestTableProps } from '../QuestTable';
import type { Quest } from '@/lib/types/admin';

function makeQuests(count: number, prefix = 'q'): Quest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
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

function baseProps(quests: Quest[]): QuestTableProps {
  return {
    quests,
    isLoading: false,
    selectedQuests: new Set<string>(),
    sortField: 'deadline',
    sortOrder: 'asc',
    allSelected: false,
    onSort: vi.fn(),
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onDelete: vi.fn(),
  };
}

describe('QuestTable pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the first page of quests by default', () => {
    render(<QuestTable {...baseProps(makeQuests(25))} />);

    const rows = screen.getAllByRole('checkbox').slice(1);
    expect(rows).toHaveLength(10);
    expect(screen.getByTestId('quest-table-range')).toHaveTextContent(
      'Showing 1–10 of 25'
    );
    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 1 of 3'
    );
  });

  it('navigates forward and back through pages', () => {
    render(<QuestTable {...baseProps(makeQuests(25))} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByTestId('quest-table-range')).toHaveTextContent(
      'Showing 11–20 of 25'
    );
    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 2 of 3'
    );
    expect(screen.getByText('Quest 10')).toBeInTheDocument();
    expect(screen.queryByText('Quest 0')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 1 of 3'
    );
    expect(screen.getByText('Quest 0')).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(<QuestTable {...baseProps(makeQuests(25))} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 3 of 3'
    );
  });

  it('resets to the first page when the quests prop changes', () => {
    const quests = makeQuests(25);
    const { rerender } = render(<QuestTable {...baseProps(quests)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 2 of 3'
    );

    rerender(<QuestTable {...baseProps([...quests])} />);

    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 1 of 3'
    );
    expect(screen.getByText('Quest 0')).toBeInTheDocument();
  });

  it('changes the page size and updates the range', () => {
    render(<QuestTable {...baseProps(makeQuests(25))} />);

    fireEvent.change(screen.getByTestId('quest-table-page-size'), {
      target: { value: '25' },
    });

    expect(screen.getByTestId('quest-table-range')).toHaveTextContent(
      'Showing 1–25 of 25'
    );
    expect(screen.getByTestId('quest-table-page-indicator')).toHaveTextContent(
      'Page 1 of 1'
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(26);
  });

  it('does not render the pagination footer for an empty list', () => {
    render(<QuestTable {...baseProps([])} />);

    expect(screen.queryByTestId('quest-table-range')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next' })
    ).not.toBeInTheDocument();
  });

  it('does not render the pagination footer while loading', () => {
    render(<QuestTable {...baseProps(makeQuests(25))} isLoading={true} />);

    expect(screen.queryByTestId('quest-table-range')).not.toBeInTheDocument();
  });
});
