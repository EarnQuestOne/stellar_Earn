/**
 * FE-074: Dark mode color-contrast checks for BadgeDisplay.
 *
 * BadgeDisplay uses Tailwind dark: classes:
 *   Card bg:        dark:bg-zinc-900 (#18181b)
 *   Card border:    dark:border-zinc-800 (#27272a)
 *   Section title:  dark:text-zinc-50  (#fafafa)
 *   Rarity label:   dark:text-zinc-400 (#a1a1aa)
 *   Count badge bg: dark:bg-zinc-800   (#27272a)
 *   Count text:     dark:text-zinc-300 (#d4d4d8)
 *
 * Badge rarity labels (non-interactive):
 *   Common:    dark:text-zinc-400 (#a1a1aa)
 *   Rare:      dark:text-blue-400 (#60a5fa)
 *   Epic:      dark:text-purple-400 (#c084fc)
 *   Legendary: dark:text-amber-400 (#fbbf24)
 *
 * Rarity badge backgrounds (circular):
 *   Common:    dark:bg-zinc-800   (#27272a)
 *   Rare:      dark:bg-blue-900/30 blended (#1a222f)
 *   Epic:      dark:bg-purple-900/30 blended (#2b193b)
 *   Legendary: dark:from-amber-900/30 dark:to-orange-900/30
 *
 * Rarity borders:
 *   Common:    dark:border-zinc-600 (#52525b)
 *   Rare:      dark:border-blue-500 (#3b82f6)
 *   Epic:      dark:border-purple-500 (#a855f7)
 *   Legendary: dark:border-amber-500 (#f59e0b)
 */

import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAG_AA,
  WCAG_AA_LARGE,
} from '@/lib/utils/color-contrast';

const ZINC = {
  900: '#18181b',
  800: '#27272a',
  600: '#52525b',
  400: '#a1a1aa',
  300: '#d4d4d8',
  50: '#fafafa',
};

// Blended backgrounds for dark:bg-{color}-900/30 on zinc-900
const BLENDED = {
  blue: '#1a222f',
  purple: '#2b193b',
  amber: '#352117',
};

describe('BadgeDisplay – dark mode color contrast (FE-074)', () => {
  describe('card surface', () => {
    it('section title (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(ZINC[50], ZINC[900])).toBe(true);
    });

    it('count text (zinc-300) on count badge bg (zinc-800) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(ZINC[300], ZINC[800])).toBe(true);
    });
  });

  describe('rarity breakdown labels', () => {
    it('common rarity label (zinc-400) on card bg (zinc-900) meets WCAG AA large/UI', () => {
      expect(meetsWCAG_AA(ZINC[400], ZINC[900], true)).toBe(true);
    });

    it('rare label (blue-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA('#60a5fa', ZINC[900])).toBe(true);
    });

    it('epic label (purple-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA('#c084fc', ZINC[900])).toBe(true);
    });

    it('legendary label (amber-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA('#fbbf24', ZINC[900])).toBe(true);
    });
  });
});
