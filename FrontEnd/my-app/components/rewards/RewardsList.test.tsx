import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PayoutHistoryResponse } from '@/lib/types/api.types';
import { RewardsList } from './RewardsList';

vi.mock('@/lib/api/payouts', () => ({
  getPayoutHistory: vi.fn(),
}));

import { getPayoutHistory } from '@/lib/api/payouts';

const mockPayoutHistory: PayoutHistoryResponse = {
  payouts: [
    {
      id: 'payout-1',
      stellarAddress: 'GABC123',
      amount: 500,
      asset: 'XLM',
      status: 'completed',
      type: 'quest_reward',
      questId: 'quest-1',
      submissionId: 'sub-1',
      transactionHash: 'abc123',
      stellarLedger: 1000,
      failureReason: null,
      retryCount: 0,
      processedAt: '2024-02-01T00:00:00.000Z',
      claimedAt: '2024-02-01T00:00:00.000Z',
      createdAt: '2024-02-01T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

describe('RewardsList – reward images accessibility', () => {
  beforeEach(() => {
    vi.mocked(getPayoutHistory).mockResolvedValue(mockPayoutHistory);
  });

  it('renders payout rows with visible reward amounts and assets', async () => {
    render(<RewardsList />);

    expect(await screen.findByText('Payout History')).toBeInTheDocument();
    expect(screen.getAllByText('XLM').length).toBeGreaterThan(0);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('does not render any images with empty alt text', async () => {
    const { container } = render(<RewardsList />);

    await screen.findByText('Payout History');

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[alt=""]')).toBeNull();
  });
});