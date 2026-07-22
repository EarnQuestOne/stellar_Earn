/**
 * FE-074: Dark mode color-contrast checks for BadgeGallery and LevelBadge.
 *
 * BadgeGallery uses Tailwind dark: classes:
 *   Earned card:   dark:bg-zinc-900 (#18181b)  dark:text-zinc-50 (#fafafa)
 *   Locked card:   dark:bg-zinc-950 (#09090b)  (opacity-50 / grayscale – informational)
 *   Badge name:    dark:text-zinc-50 (#fafafa)
 *   Tooltip bg:    dark:bg-zinc-800 (#27272a)
 *   Tooltip text:  text-white (#ffffff)
 *   Tooltip muted: dark:text-zinc-400 (#a1a1aa)
 *   Lock icon:     dark:text-zinc-600 (#52525b) – decorative, aria-hidden
 *   Border rare:   dark:border-blue-600 (#2563eb)
 *   Border epic:   dark:border-purple-600 (#9333ea)
 *   Border legend: dark:border-yellow-600 (#ca8a04)
 *
 * LevelBadge:
 *   Background: #089ec3 (brand cyan, same in light/dark)
 *   Text:       #ffffff (white)
 */

import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAG_AA,
  WCAG_AA_LARGE,
} from '@/lib/utils/color-contrast';

// Tailwind zinc palette values used in the components
const ZINC = {
  50: '#fafafa',
  400: '#a1a1aa',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
};

describe('BadgeGallery – dark mode color contrast (FE-074)', () => {
  describe('earned badge card', () => {
    it('badge name (zinc-50) on earned card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(ZINC[50], ZINC[900])).toBe(true);
    });
  });

  describe('locked badge card', () => {
    it('badge name (zinc-50) on locked card bg (zinc-950) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(ZINC[50], ZINC[950])).toBe(true);
    });
  });

  describe('tooltip', () => {
    it('white tooltip text on tooltip bg (zinc-800) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA('#ffffff', ZINC[800])).toBe(true);
    });

    it('muted tooltip text (zinc-400) on tooltip bg (zinc-800) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(ZINC[400], ZINC[800]);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });
  });
});

describe('LevelBadge – color contrast (FE-074)', () => {
  const BRAND_CYAN = '#089ec3';

  it('white level number on brand cyan (#089ec3) meets WCAG AA large/UI', () => {
    expect(meetsWCAG_AA('#ffffff', BRAND_CYAN, true)).toBe(true);
  });

  it('contrast ratio of white on brand cyan is documented', () => {
    const ratio = contrastRatio('#ffffff', BRAND_CYAN);
    // Ratio should be ≥ 3:1 (AA large) – log for visibility
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
  });
});
