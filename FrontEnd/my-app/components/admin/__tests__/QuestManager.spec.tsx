'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestManager } from '../QuestManager';
import type { QuestManagerProps } from '../QuestManager';
import type { Quest, QuestStatus } from '@/lib/types/admin';
import '@testing-library/jest-dom';

const mockQuests: Quest[] = [
  {
    id: '1',
    title: 'Test Quest 1',
    description: 'This is a test quest',
    shortDescription: 'Short desc',
    category: 'Development',
    difficulty: 'beginner',
    status: 'active',
    reward: 100,
    xpReward: 50,
    deadline: '2025-12-31T23:59:59Z',
    maxParticipants: 100,
    currentParticipants: 50,
    requirements: ['req1'],
    tags: ['tag1'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
  },
  {
    id: '2',
    title: 'Test Quest 2',
    description: 'Another test quest',
    shortDescription: 'Short desc 2',
    category: 'Blockchain',
    difficulty: 'intermediate',
    status: 'draft',
    reward: 200,
    xpReward: 100,
    deadline: '2025-11-30T23:59:59Z',
    maxParticipants: 50,
    currentParticipants: 25,
    requirements: ['req2'],
    tags: ['tag2'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    createdBy: 'admin',
  },
];

describe('QuestManager', () => {
  const defaultProps: QuestManagerProps = {
    quests: mockQuests,
    isLoading: false,
    selectedQuests: new Set<string>(),
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onStatusChange: vi.fn().mockResolvedValue({ success: true }),
    onDelete: vi.fn().mockResolvedValue({ success: true }),
    onBulkOperation: vi.fn().mockResolvedValue({ success: true }),
    onEdit: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest list correctly', () => {
    render(<QuestManager {...defaultProps} />);

    expect(screen.getByText('Test Quest 1')).toBeInTheDocument();
    expect(screen.getByText('Test Quest 2')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('100 XLM')).toBeInTheDocument();
    expect(screen.getByText('200 XLM')).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    render(<QuestManager {...defaultProps} isLoading={true} />);

    // Check for skeleton elements by their aria-hidden attribute
    const skeletons = screen.getAllByRole('generic', { hidden: true });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows "No quests found" when there are no quests', () => {
    render(<QuestManager {...defaultProps} quests={[]} />);

    expect(screen.getByText('No quests found')).toBeInTheDocument();
  });

  it('filters quests by search query', () => {
    render(<QuestManager {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search quests...');
    fireEvent.change(searchInput, { target: { value: 'Quest 1' } });

    expect(screen.getByText('Test Quest 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Quest 2')).not.toBeInTheDocument();
  });

  it('filters quests by status', () => {
    render(<QuestManager {...defaultProps} />);

    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(screen.getByText('Test Quest 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Quest 2')).not.toBeInTheDocument();
  });

  it('calls onToggleSelect when selecting a quest', () => {
    render(<QuestManager {...defaultProps} />);

    const checkbox = screen.getAllByRole('checkbox')[1]; // First quest checkbox
    fireEvent.click(checkbox);

    expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('1');
  });

  it('calls onSelectAll or onClearSelection when selecting all', () => {
    render(<QuestManager {...defaultProps} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });

  it('shows bulk actions when quests are selected', () => {
    render(<QuestManager {...defaultProps} selectedQuests={new Set(['1'])} />);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
  });

  it('calls onBulkOperation for bulk actions', async () => {
    render(
      <QuestManager {...defaultProps} selectedQuests={new Set(['1', '2'])} />
    );

    const bulkActionsButton = screen.getByText('Bulk Actions');
    fireEvent.click(bulkActionsButton);

    const activateButton = screen.getByText('Activate');
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(defaultProps.onBulkOperation).toHaveBeenCalledWith('activate');
    });
  });

  it('shows delete confirmation dialog when delete button is clicked', async () => {
    render(<QuestManager {...defaultProps} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Quest')).toBeInTheDocument();
    expect(
      screen.getByText('This action cannot be undone.')
    ).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', async () => {
    render(<QuestManager {...defaultProps} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    const confirmDeleteButton = screen.getByText('Delete');
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
    });
  });

  it('shows "New Quest" link when onEdit is not provided', () => {
    render(<QuestManager {...defaultProps} />);

    expect(screen.getByText('New Quest')).toBeInTheDocument();
  });

  it('shows edit button when onEdit is provided', () => {
    const onEdit = vi.fn();
    render(<QuestManager {...defaultProps} onEdit={onEdit} />);

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons[0].tagName).toBe('BUTTON');

    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockQuests[0]);
  });

  it('sorts quests by title when title header is clicked', () => {
    render(<QuestManager {...defaultProps} />);

    const titleHeader = screen.getByText('Title');
    fireEvent.click(titleHeader);

    expect(screen.getByText('↑')).toBeInTheDocument();
  });
});
