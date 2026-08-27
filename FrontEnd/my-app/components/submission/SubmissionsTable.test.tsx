import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { SubmissionsTable } from './SubmissionsTable';
import type { Submission } from '@/lib/types/submission';

vi.mock('./StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => status,
}));

function makeSubmissions(count: number): Submission[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `submission-${index + 1}`,
    questId: `quest-${index + 1}`,
    userId: 'user-1',
    status: 'Pending',
    proof: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    quest: {
      id: `quest-${index + 1}`,
      title: `Quest ${index + 1}`,
      rewardAmount: '10',
      rewardAsset: 'XLM',
    },
  }));
}

describe('SubmissionsTable pagination', () => {
  it('shows the first ten submissions and pagination controls by default', () => {
    render(<SubmissionsTable submissions={makeSubmissions(25)} />);

    expect(screen.getByText('Quest 1')).toBeInTheDocument();
    expect(screen.getByText('Quest 10')).toBeInTheDocument();
    expect(screen.queryByText('Quest 11')).not.toBeInTheDocument();
    expect(screen.getByTestId('submissions-table-range')).toHaveTextContent(
      'Showing 1–10 of 25'
    );
    expect(
      screen.getByRole('button', { name: 'Previous page' })
    ).toBeDisabled();
  });

  it('moves between pages and updates the displayed range', () => {
    render(<SubmissionsTable submissions={makeSubmissions(25)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('Quest 11')).toBeInTheDocument();
    expect(screen.queryByText('Quest 1')).not.toBeInTheDocument();
    expect(screen.getByTestId('submissions-table-range')).toHaveTextContent(
      'Showing 11–20 of 25'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(screen.getByText('Quest 1')).toBeInTheDocument();
  });

  it('returns to the first page when the submission results change', () => {
    const submissions = makeSubmissions(25);
    const { rerender } = render(<SubmissionsTable submissions={submissions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    rerender(<SubmissionsTable submissions={[...submissions]} />);

    expect(screen.getByTestId('submissions-table-range')).toHaveTextContent(
      'Showing 1–10 of 25'
    );
    expect(screen.getByText('Quest 1')).toBeInTheDocument();
  });

  it('does not show controls when all submissions fit on one page', () => {
    render(<SubmissionsTable submissions={makeSubmissions(10)} />);

    expect(
      screen.queryByTestId('submissions-table-range')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' })
    ).not.toBeInTheDocument();
  });
});
