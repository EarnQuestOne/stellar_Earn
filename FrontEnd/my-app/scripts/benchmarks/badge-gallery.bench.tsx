import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BadgeGallery } from '@/components/reputation/BadgeGallery';
import type { Badge } from '@/lib/types/reputation';

const SIZES = [200, 1000];
const ITERATIONS = 3;

function makeBadges(n: number): Badge[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `badge-${i}`,
    name: `Badge ${i}`,
    description: `Description for badge ${i}`,
    icon: '🏆',
    requirement: `Requirement ${i}`,
    rarity: (['common', 'rare', 'epic', 'legendary'] as const)[i % 4],
  }));
}

/**
 * Non-memoized stand-in for the pre-#2497 grid: every card re-renders on every
 * parent render. Used as the "before" baseline.
 */
function BaselineCard({
  badge,
  isEarned,
}: {
  badge: Badge;
  isEarned: boolean;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-label={`View badge ${badge.name}`}
        className={isEarned ? 'hover:scale-105' : 'opacity-50 grayscale'}
      >
        {badge.name}
      </button>
    </div>
  );
}

function BaselineGallery({
  badges,
  earnedBadgeIds,
}: {
  badges: Badge[];
  earnedBadgeIds: string[];
}) {
  return (
    <div className="grid">
      {badges.map((badge) => (
        <BaselineCard
          key={badge.id}
          badge={badge}
          isEarned={earnedBadgeIds.includes(badge.id)}
        />
      ))}
    </div>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

describe('BadgeGallery render benchmark (#2497)', () => {
  it('measures mount and unchanged-update cost', () => {
    const results = SIZES.map((n) => {
      const badges = makeBadges(n);
      const earned = badges.filter((b) => b.id.endsWith('0')).map((b) => b.id);
      const stableHandler = () => {};

      let memoMountBest = Infinity;
      let memoUpdateBest = Infinity;
      let baselineUpdateBest = Infinity;

      for (let i = 0; i < ITERATIONS; i++) {
        const memoStart = performance.now();
        const memoRender = render(
          <BadgeGallery
            badges={badges}
            earnedBadgeIds={earned}
            onBadgeClick={stableHandler}
          />
        );
        memoMountBest = Math.min(memoMountBest, performance.now() - memoStart);

        // Unchanged data, new callback identity: memoized cards should bail out.
        const memoUpdateStart = performance.now();
        memoRender.rerender(
          <BadgeGallery
            badges={badges}
            earnedBadgeIds={earned}
            onBadgeClick={stableHandler}
          />
        );
        memoUpdateBest = Math.min(
          memoUpdateBest,
          performance.now() - memoUpdateStart
        );
        memoRender.unmount();

        const baselineRender = render(
          <BaselineGallery badges={badges} earnedBadgeIds={earned} />
        );
        const baselineUpdateStart = performance.now();
        baselineRender.rerender(
          <BaselineGallery badges={badges} earnedBadgeIds={earned} />
        );
        baselineUpdateBest = Math.min(
          baselineUpdateBest,
          performance.now() - baselineUpdateStart
        );
        baselineRender.unmount();
      }

      return {
        badges: n,
        mountMs: round(memoMountBest),
        memoizedUpdateMs: round(memoUpdateBest),
        baselineUpdateMs: round(baselineUpdateBest),
      };
    });

    const outPath =
      process.env.BADGE_GALLERY_BENCH_OUT ||
      resolve(__dirname, 'results', 'badge-gallery.latest.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), results },
        null,
        2
      )
    );

    console.log('badge-gallery benchmark', JSON.stringify(results));
  });
});
