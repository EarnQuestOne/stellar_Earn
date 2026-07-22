/**
 * FE-074: Dark mode color-contrast checks for StatusBadge (submission).
 *
 * StatusBadge variants use Tailwind dark: classes:
 *   Pending:      dark:bg-orange-900/30 dark:text-orange-400 (#fb923c on #361e18)
 *   Approved:     dark:bg-green-900/30  dark:text-green-400  (#4ade80 on #172a20)
 *   Rejected:     dark:bg-red-900/30    dark:text-red-400    (#f87171 on #371a1c)
 *   Paid:         dark:bg-blue-900/30   dark:text-blue-400   (#60a5fa on #1a222f)
 *   Under Review: dark:bg-blue-900/30   dark:text-blue-400   (#60a5fa on #1a222f)
 *
 * All effective backgrounds are 30% color-900 blended over zinc-900 (#18181b).
 */

import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAG_AA,
  WCAG_AA_LARGE,
} from '@/lib/utils/color-contrast';

const BADGES = {
  pending: { bg: '#361e18', text: '#fb923c' },
  approved: { bg: '#172a20', text: '#4ade80' },
  rejected: { bg: '#371a1c', text: '#f87171' },
  paid: { bg: '#1a222f', text: '#60a5fa' },
  underReview: { bg: '#1a222f', text: '#60a5fa' },
};

describe('StatusBadge (submission) – dark mode color contrast (FE-074)', () => {
  describe('badge text on blended backgrounds', () => {
    Object.entries(BADGES).forEach(([name, { bg, text }]) => {
      it(`${name} badge text on blended bg meets WCAG AA large/UI`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });
});
