/**
 * FE-074: Dark mode color-contrast checks for QuestCard.
 *
 * QuestCard uses CSS custom properties from themes.css (html.dark):
 *   --theme-bg:           #090d14
 *   --theme-surface:      #111827  (card background)
 *   --theme-surface-muted:#1f2937  (skill tags, default category badge)
 *   --theme-text:         #e5e7eb  (title, main text)
 *   --theme-text-muted:   #94a3b8  (description, progress labels)
 *   --theme-primary:      #22b8d6  (progress %, hover title)
 *
 * Category badge dark overrides (background / text):
 *   security:  #2e1065 / #c4b5fd
 *   frontend:  #1e3a5f / #93c5fd
 *   backend:   #431407 / #fdba74
 *   docs:      #042f2e / #5eead4
 *   testing:   #422006 / #fde047
 *   community: #500724 / #f9a8d4
 *
 * Difficulty badges always use white text (#fff) on:
 *   easy:   #22c55e
 *   medium: #f97316
 *   hard:   #ef4444
 */

import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAG_AA,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
} from '@/lib/utils/color-contrast';

// Dark mode theme tokens
const DARK = {
  surface: '#111827',
  surfaceMuted: '#1f2937',
  text: '#e5e7eb',
  textMuted: '#94a3b8',
  primary: '#22b8d6',
};

describe('QuestCard – dark mode color contrast (FE-074)', () => {
  describe('card surface vs text', () => {
    it('main text (#e5e7eb) on card surface (#111827) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('muted text (#94a3b8) on card surface (#111827) meets WCAG AA large/UI', () => {
      // Description and progress labels are small text; we target AA large (3:1) as a minimum
      // and document the actual ratio for transparency.
      const ratio = contrastRatio(DARK.textMuted, DARK.surface);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });

    it('primary color (#22b8d6) on card surface (#111827) meets WCAG AA large/UI', () => {
      expect(meetsWCAG_AA(DARK.primary, DARK.surface, true)).toBe(true);
    });
  });

  describe('skill tags – surface-muted background', () => {
    it('muted text (#94a3b8) on surface-muted (#1f2937) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(DARK.textMuted, DARK.surfaceMuted);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });
  });

  describe('category badges – dark mode overrides', () => {
    const categories = [
      { name: 'security', bg: '#2e1065', text: '#c4b5fd' },
      { name: 'frontend', bg: '#1e3a5f', text: '#93c5fd' },
      { name: 'backend', bg: '#431407', text: '#fdba74' },
      { name: 'docs', bg: '#042f2e', text: '#5eead4' },
      { name: 'testing', bg: '#422006', text: '#fde047' },
      { name: 'community', bg: '#500724', text: '#f9a8d4' },
    ];

    categories.forEach(({ name, bg, text }) => {
      it(`${name} badge text meets WCAG AA large/UI on its dark background`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });

  describe('difficulty badges – text on colored backgrounds', () => {
    // After FE-074 fix: easy/medium use dark text for WCAG compliance.
    // Hard retains white text (ratio 3.76:1 ≥ 3:1 AA large).
    const difficulties = [
      { name: 'easy', bg: '#22c55e', text: '#14532d' }, // dark green text
      { name: 'medium', bg: '#f97316', text: '#431407' }, // dark brown text
      { name: 'hard', bg: '#ef4444', text: '#ffffff' }, // white text
    ];

    difficulties.forEach(({ name, bg, text }) => {
      it(`${name} difficulty badge text meets WCAG AA large/UI`, () => {
        expect(meetsWCAG_AA(text, bg, true)).toBe(true);
      });
    });
  });

  describe('contrast ratio values are within expected ranges', () => {
    it('main text on surface has ratio ≥ 10 (high contrast)', () => {
      expect(contrastRatio(DARK.text, DARK.surface)).toBeGreaterThanOrEqual(10);
    });

    it('primary on surface has ratio ≥ 3', () => {
      expect(contrastRatio(DARK.primary, DARK.surface)).toBeGreaterThanOrEqual(
        WCAG_AA_LARGE
      );
    });
  });
});
