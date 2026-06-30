/**
 * FE-074: Dark mode color-contrast checks for SubmissionSummaryCards.
 *
 * SubmissionSummaryCards uses Tailwind dark: classes:
 *   Card bg:       dark:bg-zinc-900   (#18181b)
 *   Card border:   dark:border-zinc-700 (#3f3f46)
 *   Label text:    dark:text-zinc-400  (#a1a1aa)
 *   Value text:    dark:text-zinc-50   (#fafafa)
 *
 * Highlighted card (first column) uses inline style:
 *   backgroundColor: 'rgba(8, 158, 195, 0.1)' over dark:bg-zinc-900
 *   Effective blended bg: #1a2932
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
  highlightedSurface: '#1a2932',
  text: '#fafafa',
  textMuted: '#a1a1aa',
};

describe('SubmissionSummaryCards – dark mode color contrast (FE-074)', () => {
  describe('card surface', () => {
    it('label text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('value text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });
  });

  describe('highlighted card', () => {
    it('label text (zinc-400) on highlighted bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.highlightedSurface)).toBe(true);
    });

    it('value text (zinc-50) on highlighted bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.highlightedSurface)).toBe(true);
    });
  });
});
