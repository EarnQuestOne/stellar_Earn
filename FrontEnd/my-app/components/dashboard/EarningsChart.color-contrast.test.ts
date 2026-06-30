/**
 * FE-074: Dark mode color-contrast checks for EarningsChart.
 *
 * EarningsChart uses Tailwind dark: classes:
 *   Card bg:            dark:bg-zinc-900 (#18181b)
 *   Card border:        dark:border-zinc-800 (#27272a)
 *   Heading text:       dark:text-zinc-50  (#fafafa)
 *   Subtitle text:      dark:text-zinc-400 (#a1a1aa)
 *   Value text (total): dark:text-zinc-50  (#fafafa)
 *   Tooltip text:       dark:text-zinc-300 (#d4d4d8)
 *   X-axis labels:      dark:text-zinc-400 (#a1a1aa)
 *   Divider:            dark:border-zinc-800 (#27272a)
 *   Summary dt:         dark:text-zinc-400 (#a1a1aa)
 *   Summary dd:         dark:text-zinc-50  (#fafafa)
 *   Change positive:    dark:text-green-400 (#4ade80)
 *   Skeleton bar:       dark:bg-zinc-700   (#3f3f46)
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
  textDim: '#d4d4d8',
  positive: '#4ade80',
};

describe('EarningsChart – dark mode color contrast (FE-074)', () => {
  describe('card surface vs text', () => {
    it('heading text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('subtitle text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('total value text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });
  });

  describe('chart area', () => {
    it('tooltip text (zinc-300) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textDim, DARK.surface)).toBe(true);
    });

    it('x-axis label text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });
  });

  describe('summary stats', () => {
    it('summary dt (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('summary dd (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('change positive text (green-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.positive, DARK.surface)).toBe(true);
    });
  });

  describe('contrast ratio values are within expected ranges', () => {
    it('main text on surface has ratio ≥ 15 (very high contrast)', () => {
      expect(contrastRatio(DARK.text, DARK.surface)).toBeGreaterThanOrEqual(15);
    });
  });
});
