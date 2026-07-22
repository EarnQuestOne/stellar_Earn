/**
 * FE-074: Dark mode color-contrast checks for Modal.
 *
 * Modal uses Tailwind dark: classes:
 *   Dialog bg:          dark:bg-zinc-900 (#18181b)
 *   Header border:      dark:border-zinc-800 (#27272a)
 *   Title text:         dark:text-zinc-50  (#fafafa)
 *   Close button:       dark:text-zinc-400 (#a1a1aa)
 *   Close button hover: dark:hover:text-zinc-50 (#fafafa)
 *   Body text:          dark:text-zinc-400 (#a1a1aa)
 *   Dim body text:      dark:text-zinc-500 (#71717a)
 *
 * SubmissionSuccessModal:
 *   Check icon bg: dark:bg-green-900/30   (#172a20)
 *   Check icon:    dark:text-green-400    (#4ade80)
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
  textDim: '#71717a',
};

describe('Modal – dark mode color contrast (FE-074)', () => {
  describe('dialog surface', () => {
    it('title text (zinc-50) on dialog bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.text, DARK.surface)).toBe(true);
    });

    it('close button text (zinc-400) on dialog bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('body text (zinc-400) on dialog bg (zinc-900) meets WCAG AA normal', () => {
      expect(meetsWCAG_AA(DARK.textMuted, DARK.surface)).toBe(true);
    });

    it('dim body text (zinc-500) on dialog bg (zinc-900) meets WCAG AA large/UI', () => {
      const ratio = contrastRatio(DARK.textDim, DARK.surface);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });
  });

  describe('submission success modal', () => {
    it('check icon (green-400) on blended green bg meets WCAG AA large/UI', () => {
      expect(meetsWCAG_AA('#4ade80', '#172a20', true)).toBe(true);
    });
  });
});
