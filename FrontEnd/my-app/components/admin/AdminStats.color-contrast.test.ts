/**
 * FE-074: Dark mode color-contrast checks for AdminStats.
 *
 * AdminStats uses Tailwind dark: classes:
 *   Card bg:            dark:bg-zinc-900 (#18181b)
 *   Card border:        dark:border-zinc-800 (#27272a)
 *   Value text:         dark:text-zinc-50  (#fafafa)
 *   Title text:         dark:text-zinc-400 (#a1a1aa)
 *   Change positive:    dark:text-green-400 (#4ade80)
 *   Change negative:    dark:text-red-400   (#f87171)
 *
 * Icon container bg (dark:bg-{color}-900/30 dark:text-{color}-400):
 *   blue:   blended (#1a222f) text (#60a5fa)
 *   green:  blended (#172a20) text (#4ade80)
 *   purple: blended (#2b193b) text (#c084fc)
 *   amber:  blended (#352117) text (#fbbf24)
 *   red:    blended (#371a1c) text (#f87171)
 *   zinc:   dark:bg-zinc-800 (#27272a) dark:text-zinc-400 (#a1a1aa)
 *
 * Summary section:
 *   dark:bg-zinc-800/50 (#202024) – on zinc-900 bg
 *   Tracking label:    dark:text-zinc-400 (#a1a1aa)
 *   Green value:       dark:text-green-400 (#4ade80)
 *   Blue value:        dark:text-blue-400  (#60a5fa)
 *   Zinc value:        dark:text-zinc-50   (#fafafa) (dark:bg-zinc-800/50 card)
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
  surfaceMuted: '#202024',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  positive: '#4ade80',
  negative: '#f87171',
};

describe('AdminStats – dark mode color contrast (FE-074)', () => {
  describe('stat card surface', () => {
    it('value text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('title text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('positive change (green-400) on card bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.positive, DARK.surface)).toBe(true);
    });

    it('negative change (red-400) on card bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.negative, DARK.surface)).toBe(true);
    });
  });

  describe('summary section', () => {
    it('tracking label (zinc-400) on summary card bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surfaceMuted)).toBe(true);
    });

    it('zinc value (zinc-50) on summary card bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surfaceMuted)).toBe(true);
    });

    it('green value on summary card bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.positive, DARK.surfaceMuted)).toBe(true);
    });
  });
});
