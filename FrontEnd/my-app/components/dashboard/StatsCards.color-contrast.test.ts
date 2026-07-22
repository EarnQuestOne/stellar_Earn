/**
 * FE-074: Dark mode color-contrast checks for StatsCards.
 *
 * StatsCards uses Tailwind dark: classes:
 *   Card bg:       dark:bg-zinc-900 (#18181b)
 *   Card border:   dark:border-zinc-800 (#27272a)
 *   Value text:    dark:text-zinc-50  (#fafafa)
 *   Label text:    dark:text-zinc-400 (#a1a1aa)
 *   Positive:      text-emerald-400   (#34d399)
 *   Negative:      text-red-400       (#f87171)
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
  positive: '#34d399',
  negative: '#f87171',
};

describe('StatsCards – dark mode color contrast (FE-074)', () => {
  describe('card surface vs text', () => {
    it('value text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('label text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });
  });

  describe('trend indicators', () => {
    it('positive trend (emerald-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.positive, DARK.surface)).toBe(true);
    });

    it('negative trend (red-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.negative, DARK.surface)).toBe(true);
    });
  });
});
