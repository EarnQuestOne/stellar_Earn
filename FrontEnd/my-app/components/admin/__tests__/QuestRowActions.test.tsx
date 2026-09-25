import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestRowActions } from '../QuestRowActions';
import type { QuestRowActionsProps } from '../QuestRowActions';
import type { Quest } from '@/lib/types/admin';

const mockQuest: Quest = {
  id: '1',
  title: 'Test Quest',
  description: 'A test quest',
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
};

describe('QuestRowActions', () => {
  const defaultProps: QuestRowActionsProps = {
    quest: mockQuest,
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders edit as link when onEdit is not provided', () => {
    render(<QuestRowActions {...defaultProps} />);

    const editLink = screen.getByText('Edit');
    expect(editLink.tagName).toBe('A');
    expect(editLink).toHaveAttribute('href', '/admin/quests/1/edit');
  });

  it('renders edit as button when onEdit is provided', () => {
    render(<QuestRowActions {...defaultProps} onEdit={vi.fn()} />);

    const editButton = screen.getByText('Edit');
    expect(editButton.tagName).toBe('BUTTON');
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<QuestRowActions {...defaultProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledWith(mockQuest);
  });

  it('renders delete button and calls onDelete when clicked', () => {
    const onDelete = vi.fn();
    render(<QuestRowActions {...defaultProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
