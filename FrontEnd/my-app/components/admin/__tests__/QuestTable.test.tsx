import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestTable } from '../QuestTable';
import type { QuestTableProps } from '../QuestTable';
import type { Quest } from '@/lib/types/admin';

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

describe('QuestTable', () => {
  const defaultProps: QuestTableProps = {
    quests: mockQuests,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest rows', () => {
    render(<QuestTable {...defaultProps} />);

    expect(screen.getByText('Test Quest 1')).toBeInTheDocument();
    expect(screen.getByText('Test Quest 2')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('100 XLM')).toBeInTheDocument();
    expect(screen.getByText('200 XLM')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<QuestTable {...defaultProps} />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Reward')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Deadline')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    const { container } = render(<QuestTable {...defaultProps} isLoading={true} />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('shows empty state when quests array is empty', () => {
    render(<QuestTable {...defaultProps} quests={[]} />);

    expect(screen.getByText('No quests found')).toBeInTheDocument();
  });

  it('calls onSort when a sortable header is clicked', () => {
    render(<QuestTable {...defaultProps} />);

    fireEvent.click(screen.getByText('Title'));

    expect(defaultProps.onSort).toHaveBeenCalledWith('title');
  });

  it('calls onToggleSelect when a quest checkbox is clicked', () => {
    render(<QuestTable {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(defaultProps.onToggleSelect).toHaveBeenCalledWith('1');
  });

  it('calls onSelectAll when header checkbox is clicked and not all selected', () => {
    render(<QuestTable {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });

  it('calls onClearSelection when header checkbox is clicked and all selected', () => {
    render(<QuestTable {...defaultProps} allSelected={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(defaultProps.onClearSelection).toHaveBeenCalled();
  });

  it('renders sort icons', () => {
    render(
      <QuestTable {...defaultProps} sortField="title" sortOrder="asc" />
    );

    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('renders unsorted icon for non-active sort fields', () => {
    render(<QuestTable {...defaultProps} />);

    const upDownIcons = screen.getAllByText('↕');
    expect(upDownIcons.length).toBeGreaterThan(0);
  });

  it('renders edit button when onEdit is provided', () => {
    render(<QuestTable {...defaultProps} onEdit={vi.fn()} />);

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons[0].tagName).toBe('BUTTON');
  });

  it('renders edit link when onEdit is not provided', () => {
    render(<QuestTable {...defaultProps} />);

    const editLinks = screen.getAllByText('Edit');
    expect(editLinks[0].tagName).toBe('A');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<QuestTable {...defaultProps} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
  });
});
