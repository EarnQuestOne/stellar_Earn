/**
 * FE-074: Dark mode color-contrast checks for SubmissionCard.
 *
 * SubmissionCard uses Tailwind dark: classes:
 *   Card bg:              dark:bg-zinc-900   (#18181b)
 *   Card border:          dark:border-zinc-800 (#27272a)
 *   Hover border:         dark:hover:border-zinc-700 (#3f3f46)
 *   Title text:           dark:text-zinc-50  (#fafafa)
 *   Description text:     dark:text-zinc-400 (#a1a1aa)
 *   Date text:            dark:text-zinc-500 (#71717a)
 *   Separator dot:        dark:text-zinc-700 (#3f3f46)
 *   Reward amount:        dark:text-zinc-100 (#f4f4f5)
 *   Hover title color:    dark:group-hover:text-blue-400 (#60a5fa)
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
  textBody: '#f4f4f5',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  accent: '#60a5fa',
};

describe('SubmissionCard – dark mode color contrast (FE-074)', () => {
  describe('card surface vs text', () => {
    it('title text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('description text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('date text (zinc-500) on card bg (zinc-900) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(DARK.textDim, DARK.surface);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });

    it('reward amount (zinc-100) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textBody, DARK.surface)).toBe(true);
    });

    it('hover title (blue-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.accent, DARK.surface)).toBe(true);
    });
  });
});
