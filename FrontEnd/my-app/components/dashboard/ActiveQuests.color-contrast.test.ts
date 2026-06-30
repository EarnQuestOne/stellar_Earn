/**
 * FE-074: Dark mode color-contrast checks for ActiveQuests.
 *
 * ActiveQuests uses Tailwind dark: classes:
 *   Card bg:            dark:bg-zinc-900 (#18181b)
 *   Card border:        dark:border-zinc-800 (#27272a)
 *   Title text:         dark:text-zinc-100 (#f4f4f5)
 *   Deadline text:      text-zinc-500 (no dark override, #71717a)
 *   Hover row bg:       dark:hover:bg-zinc-800/30
 *   Row border:         dark:border-zinc-800 (#27272a)
 *   Reward text:        text-cyan-400 (#22d3ee, no dark override)
 *   View All button:    text-cyan-400 (#22d3ee)
 *
 * Inline StatusBadge:
 *   In Progress:        bg-cyan-400/10 text-cyan-400 (#22d3ee)
 *   Pending:            dark:bg-zinc-700/50 dark:text-zinc-300 (#d4d4d8) dark:border-zinc-600 (#52525b)
 *   In Review:          bg-amber-400/10 text-amber-400 (#fbbf24)
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
  surfaceHover: '#18181b', // hover overlay blends but bg remains zinc-900
  border: '#27272a',
  textTitle: '#f4f4f5',
  textDeadline: '#71717a',
  accentCyan: '#22d3ee',
};

// Blended bg for dark:bg-zinc-700/50 on zinc-900 = #2c2c31
const PENDING_BADGE_BG = '#2c2c31';

describe('ActiveQuests – dark mode color contrast (FE-074)', () => {
  describe('card surface', () => {
    it('quest title (zinc-100) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textTitle, DARK.surface)).toBe(true);
    });

    it('deadline text (zinc-500) on card bg (zinc-900) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(DARK.textDeadline, DARK.surface);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });

    it('reward text (cyan-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.accentCyan, DARK.surface)).toBe(true);
    });

    it('view all button (cyan-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.accentCyan, DARK.surface)).toBe(true);
    });
  });

  describe('inline status badges', () => {
    it('in_progress badge text (cyan-400) on cyan-400/10 bg (zinc-900 surface) meets WCAG AA large/UI', () => {
      // bg-cyan-400/10 is translucent over zinc-900; text is solid cyan-400.
      // The effective background is very close to zinc-900, so check against surface.
      expect(meetsWCAG_AA(DARK.accentCyan, DARK.surface, true)).toBe(true);
    });

    it('pending badge text (zinc-300) on blended bg meets WCAG AA normal', () => {
      expect(meetsWCAG_AA('#d4d4d8', PENDING_BADGE_BG)).toBe(true);
    });

    it('in_review badge text (amber-400) on amber-400/10 bg (zinc-900 surface) meets WCAG AA large/UI', () => {
      expect(meetsWCAG_AA('#fbbf24', DARK.surface, true)).toBe(true);
    });
  });
});
