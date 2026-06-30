/**
 * FE-074: Dark mode color-contrast checks for RecentSubmissions.
 *
 * RecentSubmissions uses Tailwind dark: classes:
 *   Card bg:              dark:bg-zinc-900 (#18181b)
 *   Card border:          dark:border-zinc-800 (#27272a)
 *   Heading text:         dark:text-zinc-50  (#fafafa)
 *   Table header text:    dark:text-zinc-400 (#a1a1aa)
 *   Quest name text:      dark:text-zinc-50  (#fafafa)
 *   Row border:           dark:border-zinc-800 (#27272a)
 *   Date text:            dark:text-zinc-400 (#a1a1aa)
 *   View All button:      dark:text-zinc-400 (#a1a1aa) hover:dark:text-zinc-50 (#fafafa)
 *   Approved reward:      dark:text-green-400 (#4ade80)
 *   Pending reward:       dark:text-zinc-400 (#a1a1aa)
 *
 * StatusBadge variants:
 *   Pending:   dark:bg-yellow-900/30 blended (#332418) dark:text-yellow-400 (#facc15)
 *   Approved:  dark:bg-green-900/30  blended (#172a20) dark:text-green-400  (#4ade80)
 *   Rejected:  dark:bg-red-900/30    blended (#371a1c) dark:text-red-400    (#f87171)
 *   Paid:      dark:bg-cyan-900/30   blended (#172831) dark:text-cyan-400   (#22d3ee)
 */

import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAG_AA,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
} from '@/lib/utils/color-contrast';

const DARK = {
  surface: '#18181b',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  positive: '#4ade80',
};

const BADGES = {
  pending: { bg: '#332418', text: '#facc15' },
  approved: { bg: '#172a20', text: '#4ade80' },
  rejected: { bg: '#371a1c', text: '#f87171' },
  paid: { bg: '#172831', text: '#22d3ee' },
};

describe('RecentSubmissions – dark mode color contrast (FE-074)', () => {
  describe('card surface', () => {
    it('heading text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('table header text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('quest name text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('date text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('view all button text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });
  });

  describe('reward text', () => {
    it('approved reward (green-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.positive, DARK.surface)).toBe(true);
    });

    it('pending reward (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });
  });

  describe('status badges – blended backgrounds', () => {
    Object.entries(BADGES).forEach(([name, { bg, text }]) => {
      it(`${name} badge text on blended bg meets WCAG AA large/UI`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });
});
