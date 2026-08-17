import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RewardHistory } from '../RewardHistory';
import type { ClaimResult } from '@/lib/stellar/claim';

/* ── Helpers ────────────────────────────────────────────────────────── */

function makeClaim(overrides: Partial<ClaimResult> = {}): ClaimResult {
  return {
    success: true,
    transactionHash: `tx-${Math.random().toString(36).slice(2, 10)}`,
    amount: 100,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeClaims(count: number): ClaimResult[] {
  return Array.from({ length: count }, (_, i) =>
    makeClaim({
      amount: (i + 1) * 10,
      timestamp: new Date(2026, 0, i + 1).toISOString(),
      transactionHash: `tx-${String(i + 1).padStart(3, '0')}`,
    })
  );
}

/* ── Mocks ──────────────────────────────────────────────────────────── */

vi.mock('@/lib/hooks/useFormatter', () => ({
  useFormatter: () => ({
    date: (value: Date | number | string, _style?: string) =>
      new Date(value).toLocaleDateString('en-US'),
    reward: (
      value: number | string,
      opts: { type: string; label: { singular: string; plural: string } }
    ) => `${Number(value).toLocaleString()} ${opts.label.plural}`,
    deadline: vi.fn(),
    compactReward: vi.fn(),
  }),
}));

/* ── Tests ──────────────────────────────────────────────────────────── */

describe('RewardHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Empty state ──────────────────────────────────────────────────── */

  it('renders empty state when no claims', () => {
    render(<RewardHistory claims={[]} />);

    expect(screen.getByText('Claim History')).toBeInTheDocument();
    expect(
      screen.getByText(/haven't claimed any rewards yet/)
    ).toBeInTheDocument();
  });

  it('does not render table when claims is empty', () => {
    render(<RewardHistory claims={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /* ── Rendering claims ─────────────────────────────────────────────── */

  it('renders a table with claim rows', () => {
    const claims = makeClaims(3);
    render(<RewardHistory claims={claims} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
  });

  it('renders column headers', () => {
    render(<RewardHistory claims={makeClaims(1)} />);

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Transaction')).toBeInTheDocument();
  });

  it('renders claim amounts with formatting', () => {
    const claims = [makeClaim({ amount: 1200 })];
    render(<RewardHistory claims={claims} />);

    expect(screen.getByText('1,200 Tokens')).toBeInTheDocument();
  });

  it('renders "Success" badge for each claim', () => {
    const claims = makeClaims(3);
    render(<RewardHistory claims={claims} />);

    const badges = screen.getAllByText('Success');
    expect(badges).toHaveLength(3);
  });

  it('renders transaction hash', () => {
    const claims = [makeClaim({ transactionHash: 'abc123hash' })];
    render(<RewardHistory claims={claims} />);

    expect(screen.getByText('abc123hash')).toBeInTheDocument();
  });

  /* ── Sorting (newest-first) ──────────────────────────────────────── */

  it('sorts claims newest-first by timestamp', () => {
    const claims = [
      makeClaim({
        timestamp: '2026-01-10T00:00:00Z',
        transactionHash: 'tx-old',
      }),
      makeClaim({
        timestamp: '2026-01-20T00:00:00Z',
        transactionHash: 'tx-new',
      }),
      makeClaim({
        timestamp: '2026-01-15T00:00:00Z',
        transactionHash: 'tx-mid',
      }),
    ];

    render(<RewardHistory claims={claims} />);

    const rows = screen.getAllByRole('row');
    // Row 0 is header, rows 1-3 are data
    expect(rows[1]).toHaveTextContent('tx-new');
    expect(rows[2]).toHaveTextContent('tx-mid');
    expect(rows[3]).toHaveTextContent('tx-old');
  });

  /* ── Lazy pagination ──────────────────────────────────────────────── */

  it('renders only PAGE_SIZE (10) rows initially when there are more claims', () => {
    const claims = makeClaims(25);
    render(<RewardHistory claims={claims} />);

    const dataRows = screen.getAllByRole('row');
    // 1 header + 10 data rows
    expect(dataRows).toHaveLength(11);
  });

  it('shows "Load more" button with remaining count', () => {
    const claims = makeClaims(15);
    render(<RewardHistory claims={claims} />);

    expect(screen.getByText('Load more (5 remaining)')).toBeInTheDocument();
  });

  it('hides "Load more" button when all claims are visible', () => {
    const claims = makeClaims(5);
    render(<RewardHistory claims={claims} />);

    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
  });

  it('loads more rows when "Load more" is clicked', () => {
    const claims = makeClaims(25);
    render(<RewardHistory claims={claims} />);

    // Initially 10 rows
    expect(screen.getAllByRole('row')).toHaveLength(11);

    fireEvent.click(screen.getByText('Load more (15 remaining)'));

    // After clicking: 20 rows
    expect(screen.getAllByRole('row')).toHaveLength(21);
  });

  it('shows remaining count after loading more', () => {
    const claims = makeClaims(25);
    render(<RewardHistory claims={claims} />);

    fireEvent.click(screen.getByText('Load more (15 remaining)'));

    expect(screen.getByText('Load more (5 remaining)')).toBeInTheDocument();
  });

  it('hides "Load more" after all rows are loaded', () => {
    const claims = makeClaims(25);
    render(<RewardHistory claims={claims} />);

    // Load all pages
    fireEvent.click(screen.getByText('Load more (15 remaining)'));
    fireEvent.click(screen.getByText('Load more (5 remaining)'));

    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
    // All 25 rows + 1 header
    expect(screen.getAllByRole('row')).toHaveLength(26);
  });

  /* ── Exact boundary: claims = PAGE_SIZE ───────────────────────────── */

  it('does not show Load more when claims exactly equal PAGE_SIZE', () => {
    const claims = makeClaims(10);
    render(<RewardHistory claims={claims} />);

    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  /* ── Single claim ─────────────────────────────────────────────────── */

  it('renders a single claim correctly', () => {
    const claims = [makeClaim({ amount: 50, transactionHash: 'single-tx' })];
    render(<RewardHistory claims={claims} />);

    expect(screen.getByText('single-tx')).toBeInTheDocument();
    expect(screen.getByText('50 Tokens')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
  });

  /* ── Copy hash button ─────────────────────────────────────────────── */

  it('renders a copy button for each claim', () => {
    const claims = makeClaims(2);
    render(<RewardHistory claims={claims} />);

    const copyButtons = screen.getAllByText('', {
      selector: 'button[title="Copy Hash"]',
    });
    expect(copyButtons).toHaveLength(2);
  });

  /* ── NEGATIVE test ────────────────────────────────────────────────── */

  it('does not render table or Load more when claims is empty', () => {
    render(<RewardHistory claims={[]} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/haven't claimed any rewards yet/)
    ).toBeInTheDocument();
  });
});
