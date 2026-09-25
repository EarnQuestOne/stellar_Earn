import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QuestBulkActions } from '../QuestBulkActions';
import type { QuestBulkActionsProps } from '../QuestBulkActions';

describe('QuestBulkActions', () => {
  const defaultProps: QuestBulkActionsProps = {
    selectedCount: 2,
    onBulkOperation: vi.fn().mockResolvedValue({ success: true }),
    onClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <QuestBulkActions {...defaultProps} selectedCount={0} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders selected count and bulk actions button', () => {
    render(<QuestBulkActions {...defaultProps} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
  });

  it('opens dropdown when Bulk Actions is clicked', () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Bulk Actions'));

    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onBulkOperation with activate when Activate is clicked', async () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Bulk Actions'));
    fireEvent.click(screen.getByText('Activate'));

    await waitFor(() => {
      expect(defaultProps.onBulkOperation).toHaveBeenCalledWith('activate');
    });
  });

  it('calls onBulkOperation with pause when Pause is clicked', async () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Bulk Actions'));
    fireEvent.click(screen.getByText('Pause'));

    await waitFor(() => {
      expect(defaultProps.onBulkOperation).toHaveBeenCalledWith('pause');
    });
  });

  it('calls onBulkOperation with complete when Complete is clicked', async () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Bulk Actions'));
    fireEvent.click(screen.getByText('Complete'));

    await waitFor(() => {
      expect(defaultProps.onBulkOperation).toHaveBeenCalledWith('complete');
    });
  });

  it('calls onBulkOperation with cancel when Cancel is clicked', async () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Bulk Actions'));
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(defaultProps.onBulkOperation).toHaveBeenCalledWith('cancel');
    });
  });

  it('calls onBulkOperation with delete when Delete is clicked', async () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Bulk Actions'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(defaultProps.onBulkOperation).toHaveBeenCalledWith('delete');
    });
  });

  it('calls onClear when Clear is clicked', () => {
    render(<QuestBulkActions {...defaultProps} />);

    fireEvent.click(screen.getByText('Clear'));

    expect(defaultProps.onClear).toHaveBeenCalled();
  });
});
