/**
 * FE-074: Dark mode color-contrast checks for QuestHeader.
 *
 * QuestHeader uses Tailwind dark: classes:
 *   Card bg:            dark:bg-zinc-900 (#18181b)
 *   Card border:        dark:border-zinc-800 (#27272a)
 *   Title text:         dark:text-zinc-50  (#fafafa)
 *   Participants text:  dark:text-zinc-400 (#a1a1aa)
 *
 * Status badges (dark:bg-{color}-900/30 dark:text-{color}-400):
 *   Active:    dark:bg-green-900/30  blended (#172a20) dark:text-green-400  (#4ade80)
 *   Paused:    dark:bg-yellow-900/30 blended (#332418) dark:text-yellow-400 (#facc15)
 *   Completed: dark:bg-blue-900/30   blended (#1a222f) dark:text-blue-400   (#60a5fa)
 *   Expired:   dark:bg-red-900/30    blended (#371a1c) dark:text-red-400    (#f87171)
 *
 * Category badges:
 *   Security:  dark:bg-zinc-800 dark:text-zinc-300 (#d4d4d8 on #27272a)
 *   Frontend:  dark:bg-blue-900/30  blended (#1a222f) dark:text-blue-400  (#60a5fa)
 *   Backend:   dark:bg-purple-900/30 blended (#2b193b) dark:text-purple-400 (#c084fc)
 *   Docs:      dark:bg-yellow-900/30 blended (#332418) dark:text-yellow-400 (#facc15)
 *   Testing:   dark:bg-pink-900/30   blended (#381827) dark:text-pink-400  (#f472b6)
 *   Community: dark:bg-green-900/30  blended (#172a20) dark:text-green-400 (#4ade80)
 *
 * Difficulty badges use fixed bg (no dark override) with white text:
 *   Easy:   bg-green-500 (#22c55e) text-white (#ffffff)
 *   Medium: bg-orange-500 (#f97316) text-white (#ffffff)
 *   Hard:   bg-red-500 (#ef4444) text-white (#ffffff)
 *
 * "Full" status badge: dark:bg-red-900/30 dark:text-red-400
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
};

const CATEGORY_BADGES = {
  security: { bg: '#27272a', text: '#d4d4d8' },
  frontend: { bg: '#1a222f', text: '#60a5fa' },
  backend: { bg: '#2b193b', text: '#c084fc' },
  docs: { bg: '#332418', text: '#facc15' },
  testing: { bg: '#381827', text: '#f472b6' },
  community: { bg: '#172a20', text: '#4ade80' },
};

const STATUS_BADGES = {
  active: { bg: '#172a20', text: '#4ade80' },
  paused: { bg: '#332418', text: '#facc15' },
  completed: { bg: '#1a222f', text: '#60a5fa' },
  expired: { bg: '#371a1c', text: '#f87171' },
};

const DIFFICULTIES = [
  { name: 'easy', bg: '#22c55e', text: '#14532d' },
  { name: 'medium', bg: '#f97316', text: '#431407' },
  { name: 'hard', bg: '#ef4444', text: '#ffffff' },
];

describe('QuestHeader – dark mode color contrast (FE-074)', () => {
  describe('card surface', () => {
    it('title text (zinc-50) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('participants text (zinc-400) on card bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });
  });

  describe('category badges – dark mode', () => {
    Object.entries(CATEGORY_BADGES).forEach(([name, { bg, text }]) => {
      it(`${name} category badge text on its dark bg meets WCAG AA large/UI`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });

  describe('status badges – dark mode', () => {
    Object.entries(STATUS_BADGES).forEach(([name, { bg, text }]) => {
      it(`${name} status badge text on blended bg meets WCAG AA large/UI`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });

  describe('difficulty badges – fixed colors', () => {
    DIFFICULTIES.forEach(({ name, bg, text }) => {
      it(`${name} difficulty badge (white text on color) meets WCAG AA large/UI`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });
});
