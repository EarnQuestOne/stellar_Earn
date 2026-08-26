import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestDeleteDialog } from '../QuestDeleteDialog';
import type { QuestDeleteDialogProps } from '../QuestDeleteDialog';

describe('QuestDeleteDialog', () => {
  const defaultProps: QuestDeleteDialogProps = {
    questId: '1',
    isDeleting: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when questId is null', () => {
    const { container } = render(
      <QuestDeleteDialog {...defaultProps} questId={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the delete confirmation dialog', () => {
    render(<QuestDeleteDialog {...defaultProps} />);

    expect(screen.getByText('Delete Quest')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This action cannot be undone. The quest and all its data will be permanently removed.'
      )
    ).toBeInTheDocument();
  });

  it('calls onConfirm when Delete is clicked', () => {
    render(<QuestDeleteDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete'));

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<QuestDeleteDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('shows Deleting... when isDeleting is true', () => {
    render(<QuestDeleteDialog {...defaultProps} isDeleting={true} />);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('disables confirm button when isDeleting is true', () => {
    render(<QuestDeleteDialog {...defaultProps} isDeleting={true} />);

    expect(screen.getByText('Deleting...')).toBeDisabled();
  });
});
