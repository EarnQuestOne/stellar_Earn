import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BadgeCard, BadgeGallery } from './BadgeGallery';
import type { Badge } from '@/lib/types/reputation';

const badges: Badge[] = [
  {
    id: 'first-quest',
    name: 'First Quest',
    description: 'Complete your first quest',
    icon: '🏁',
    requirement: 'Complete 1 quest',
    rarity: 'common',
    unlockedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'streak-7',
    name: 'Week Streak',
    description: 'Submit work 7 days in a row',
    icon: '🔥',
    requirement: '7 day streak',
    rarity: 'rare',
  },
];

describe('BadgeGallery (#2497)', () => {
  it('renders the illustrated empty state when there are no badges', () => {
    render(<BadgeGallery badges={[]} earnedBadgeIds={[]} />);

    expect(
      screen.getByRole('heading', { name: /no badges available/i })
    ).toBeInTheDocument();
  });

  it('renders every badge by name', () => {
    render(<BadgeGallery badges={badges} earnedBadgeIds={['first-quest']} />);

    expect(screen.getByText('First Quest')).toBeInTheDocument();
    expect(screen.getByText('Week Streak')).toBeInTheDocument();
  });

  it('marks earned badges as earned and locked badges as locked', () => {
    render(<BadgeGallery badges={badges} earnedBadgeIds={['first-quest']} />);

    const earned = screen.getByRole('button', {
      name: /view badge first quest/i,
    });
    const locked = screen.getByRole('button', {
      name: /view badge week streak/i,
    });

    expect(earned).toHaveClass('hover:scale-105');
    expect(locked).toHaveClass('grayscale');
    expect(locked).toHaveClass('opacity-50');
  });

  it('invokes onBadgeClick with the clicked badge', () => {
    const onBadgeClick = vi.fn();
    render(
      <BadgeGallery
        badges={badges}
        earnedBadgeIds={[]}
        onBadgeClick={onBadgeClick}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /view badge week streak/i })
    );

    expect(onBadgeClick).toHaveBeenCalledTimes(1);
    expect(onBadgeClick).toHaveBeenCalledWith(badges[1]);
  });

  it('updates earned state when earnedBadgeIds changes', () => {
    const { rerender } = render(
      <BadgeGallery badges={badges} earnedBadgeIds={[]} />
    );

    expect(
      screen.getByRole('button', { name: /view badge week streak/i })
    ).toHaveClass('grayscale');

    rerender(<BadgeGallery badges={badges} earnedBadgeIds={['streak-7']} />);

    expect(
      screen.getByRole('button', { name: /view badge week streak/i })
    ).toHaveClass('hover:scale-105');
  });

  it('handles a large badge list', () => {
    const many: Badge[] = Array.from({ length: 300 }, (_, i) => ({
      id: `badge-${i}`,
      name: `Badge ${i}`,
      description: `Description ${i}`,
      icon: '🏆',
      requirement: `Requirement ${i}`,
      rarity: 'common',
    }));

    render(
      <BadgeGallery
        badges={many}
        earnedBadgeIds={many.filter((b) => b.id.endsWith('0')).map((b) => b.id)}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(300);
    expect(screen.getByText('Badge 0')).toBeInTheDocument();
  });

  it('exports BadgeCard wrapped in React.memo so cards can skip re-renders', () => {
    // A React.memo component is an exotic component whose public `.type` points
    // at the wrapped render function. A plain function component has no `.type`.
    const memoized = BadgeCard as unknown as { type?: unknown };
    expect(typeof memoized.type).toBe('function');
  });
});
