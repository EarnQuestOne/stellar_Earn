/**
 * FE-074: Dark mode color-contrast checks for ReputationCard.
 *
 * ReputationCard uses Tailwind dark: classes:
 *   Card bg:          dark:bg-zinc-900  (#18181b)
 *   Card border:      dark:border-zinc-800 (#27272a)
 *   Heading text:     dark:text-zinc-50  (#fafafa)
 *   Body/label text:  dark:text-zinc-400 (#a1a1aa)
 *   Muted XP hint:    dark:text-zinc-500 (#71717a)
 *   Divider border:   dark:border-zinc-800 (#27272a)
 *
 * LevelBadge inside card: white (#fff) on brand cyan (#089ec3) – covered in BadgeGallery tests.
 */

import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAG_AA,
  WCAG_AA_LARGE,
} from '@/lib/utils/color-contrast';

const ZINC = {
  50: '#fafafa',
  400: '#a1a1aa',
  500: '#71717a',
  900: '#18181b',
};

describe('ReputationCard – dark mode color contrast (FE-074)', () => {
  describe('card surface', () => {
    it('heading text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(ZINC[50], ZINC[900])).toBe(true);
    });

    it('label/body text (zinc-400) on card bg (zinc-900) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(ZINC[400], ZINC[900]);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });

    it('muted hint text (zinc-500) on card bg (zinc-900) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(ZINC[500], ZINC[900]);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });
  });

  describe('stats grid', () => {
    it('stat value (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(ZINC[50], ZINC[900])).toBe(true);
    });

    it('stat label (zinc-400) on card bg (zinc-900) meets WCAG AA large/UI', () => {
      expect(meetsWCAG_AA(ZINC[400], ZINC[900], true)).toBe(true);
    });
  });
});
