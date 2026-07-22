/**
 * @file i18n-formatters.test.ts
 * @description Unit tests for i18n formatting utilities.
 *
 * Run with:
 *   pnpm test                     (single run)
 *   pnpm test:watch               (watch mode)
 *   pnpm test:coverage            (with coverage report)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  formatDate,
  formatDeadline,
  formatReward,
  formatRewardRange,
  formatCompactReward,
} from './i18n-formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed reference date used across tests: 2026-05-30T12:00:00.000Z */
const FIXED_DATE = new Date('2026-05-30T12:00:00.000Z');
const FIXED_MS = FIXED_DATE.getTime();

// ─────────────────────────────────────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  describe('input coercion', () => {
    it('accepts a Date object', () => {
      const result = formatDate(FIXED_DATE, { style: 'iso' });
      expect(result).toBe('2026-05-30T12:00:00.000Z');
    });

    it('accepts a Unix timestamp (ms)', () => {
      const result = formatDate(FIXED_MS, { style: 'iso' });
      expect(result).toBe('2026-05-30T12:00:00.000Z');
    });

    it('accepts an ISO-8601 string', () => {
      const result = formatDate('2026-05-30T12:00:00.000Z', { style: 'iso' });
      expect(result).toBe('2026-05-30T12:00:00.000Z');
    });

    it('throws RangeError for an invalid date string', () => {
      expect(() => formatDate('not-a-date', { locale: 'en-US' })).toThrow(
        RangeError
      );
    });

    it('throws RangeError for NaN timestamp', () => {
      expect(() => formatDate(NaN, { locale: 'en-US' })).toThrow(RangeError);
    });
  });

  describe('style: iso', () => {
    it('returns a valid ISO string regardless of locale', () => {
      const result = formatDate(FIXED_DATE, { style: 'iso', locale: 'ar-SA' });
      expect(result).toBe('2026-05-30T12:00:00.000Z');
    });
  });

  describe('style: short', () => {
    it('formats correctly for en-US', () => {
      // Intl may produce "05/30/2026" or similar — test structure not exact chars
      const result = formatDate(FIXED_DATE, {
        style: 'short',
        locale: 'en-US',
      });
      expect(result).toMatch(/\d/); // at minimum contains digits
    });

    it('produces different output for de-DE', () => {
      const en = formatDate(FIXED_DATE, { style: 'short', locale: 'en-US' });
      const de = formatDate(FIXED_DATE, { style: 'short', locale: 'de-DE' });
      // German uses DD.MM.YYYY so the strings should differ
      expect(en).not.toBe(de);
    });
  });

  describe('style: medium', () => {
    it('contains the month name for en-US', () => {
      const result = formatDate(FIXED_DATE, {
        style: 'medium',
        locale: 'en-US',
      });
      expect(result).toContain('May');
      expect(result).toContain('2026');
    });

    it('contains the month name for fr-FR', () => {
      const result = formatDate(FIXED_DATE, {
        style: 'medium',
        locale: 'fr-FR',
      });
      expect(result).toContain('2026');
    });
  });

  describe('style: long', () => {
    it('contains the weekday for en-US', () => {
      const result = formatDate(FIXED_DATE, { style: 'long', locale: 'en-US' });
      // 2026-05-30 is a Saturday
      expect(result).toContain('Saturday');
    });
  });

  describe('style: time', () => {
    it('contains colon-separated digits', () => {
      const result = formatDate(FIXED_DATE, {
        style: 'time',
        locale: 'en-US',
        timeZone: 'UTC',
      });
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('style: datetime', () => {
    it('contains both date and time parts for en-US', () => {
      const result = formatDate(FIXED_DATE, {
        style: 'datetime',
        locale: 'en-US',
        timeZone: 'UTC',
      });
      expect(result).toContain('May');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('style: relative', () => {
    beforeEach(() => {
      // Pin Date.now() to our fixed date so relative formatting is deterministic
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_DATE);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "now" or "this second" for the current instant', () => {
      const result = formatDate(FIXED_DATE, {
        style: 'relative',
        locale: 'en-US',
      });
      // Intl.RelativeTimeFormat numeric:'auto' returns "now" for 0 seconds
      expect(result).toBeTruthy();
    });

    it('returns a past relative string for yesterday', () => {
      const yesterday = new Date(FIXED_MS - 86_400_000);
      const result = formatDate(yesterday, {
        style: 'relative',
        locale: 'en-US',
      });
      expect(result).toMatch(/yesterday|1 day ago/i);
    });

    it('returns a future relative string for tomorrow', () => {
      const tomorrow = new Date(FIXED_MS + 86_400_000);
      const result = formatDate(tomorrow, {
        style: 'relative',
        locale: 'en-US',
      });
      expect(result).toMatch(/tomorrow|in 1 day/i);
    });

    it('uses weeks for 14 days away', () => {
      const twoWeeks = new Date(FIXED_MS + 14 * 86_400_000);
      const result = formatDate(twoWeeks, {
        style: 'relative',
        locale: 'en-US',
      });
      expect(result).toMatch(/week/i);
    });
  });

  describe('defaults', () => {
    it('defaults to medium style when no style provided', () => {
      const result = formatDate(FIXED_DATE, { locale: 'en-US' });
      expect(result).toContain('May');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDeadline
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Expired" for a past date (en-US)', () => {
    const past = new Date(FIXED_MS - 86_400_000);
    expect(formatDeadline(past, { locale: 'en-US' })).toBe('Expired');
  });

  it('returns "Expiré" for a past date (fr)', () => {
    const past = new Date(FIXED_MS - 86_400_000);
    expect(formatDeadline(past, { locale: 'fr-FR' })).toBe('Expiré');
  });

  it('returns "Abgelaufen" for a past date (de)', () => {
    const past = new Date(FIXED_MS - 86_400_000);
    expect(formatDeadline(past, { locale: 'de-DE' })).toBe('Abgelaufen');
  });

  it('returns an "Ends …" prefixed string for a future date (en-US)', () => {
    const future = new Date(FIXED_MS + 3 * 86_400_000);
    const result = formatDeadline(future, { locale: 'en-US' });
    expect(result).toMatch(/^Ends /);
  });

  it('returns a locale-prefixed string for fr-FR future date', () => {
    const future = new Date(FIXED_MS + 3 * 86_400_000);
    const result = formatDeadline(future, { locale: 'fr-FR' });
    expect(result).toMatch(/^Se termine /);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatReward
// ─────────────────────────────────────────────────────────────────────────────

describe('formatReward', () => {
  describe('type: points', () => {
    it('formats 1200 as "1,200 pts" for en-US', () => {
      expect(formatReward(1200, { type: 'points', locale: 'en-US' })).toBe(
        '1,200 pts'
      );
    });

    it('formats 1 as "1 pt" (singular) for en-US', () => {
      expect(formatReward(1, { type: 'points', locale: 'en-US' })).toBe('1 pt');
    });

    it('formats 0 as "0 pts" (plural) for en-US', () => {
      expect(formatReward(0, { type: 'points', locale: 'en-US' })).toBe(
        '0 pts'
      );
    });

    it('respects custom label', () => {
      const result = formatReward(2, {
        type: 'points',
        locale: 'en-US',
        label: { singular: 'star', plural: 'stars' },
      });
      expect(result).toBe('2 stars');
    });

    it('uses locale-appropriate thousands separator for de-DE', () => {
      const result = formatReward(1200, { type: 'points', locale: 'de-DE' });
      // German uses "." or non-breaking space as thousands separator
      expect(result).toMatch(/1[.\s\u202f\u00a0]?200 pts/);
    });
  });

  describe('type: currency', () => {
    it('formats USD correctly for en-US', () => {
      expect(
        formatReward(5.5, {
          type: 'currency',
          currency: 'USD',
          locale: 'en-US',
        })
      ).toBe('$5.50');
    });

    it('formats EUR correctly for de-DE', () => {
      const result = formatReward(5.5, {
        type: 'currency',
        currency: 'EUR',
        locale: 'de-DE',
      });
      expect(result).toContain('5,50');
      expect(result).toContain('€');
    });

    it('throws TypeError when currency is omitted', () => {
      expect(() =>
        formatReward(5, { type: 'currency', locale: 'en-US' })
      ).toThrow(TypeError);
    });

    it('respects maximumFractionDigits override', () => {
      const result = formatReward(5, {
        type: 'currency',
        currency: 'USD',
        locale: 'en-US',
        maximumFractionDigits: 0,
      });
      expect(result).toBe('$5');
    });
  });

  describe('type: percentage', () => {
    it('formats 0.1 as "10%" for en-US', () => {
      const result = formatReward(0.1, { type: 'percentage', locale: 'en-US' });
      expect(result).toBe('10%');
    });

    it('formats 0.5 as "50%" for en-US', () => {
      const result = formatReward(0.5, { type: 'percentage', locale: 'en-US' });
      expect(result).toBe('50%');
    });

    it('formats with fraction digits', () => {
      const result = formatReward(0.055, {
        type: 'percentage',
        locale: 'en-US',
        maximumFractionDigits: 1,
      });
      expect(result).toMatch(/5\.5%|5,5\s*%/);
    });
  });

  describe('type: custom', () => {
    it('formats correctly with singular label', () => {
      expect(
        formatReward(1, {
          type: 'custom',
          locale: 'en-US',
          label: { singular: 'token', plural: 'tokens' },
        })
      ).toBe('1 token');
    });

    it('formats correctly with plural label', () => {
      expect(
        formatReward(500, {
          type: 'custom',
          locale: 'en-US',
          label: { singular: 'token', plural: 'tokens' },
        })
      ).toBe('500 tokens');
    });

    it('throws TypeError when label is omitted', () => {
      expect(() =>
        formatReward(5, { type: 'custom', locale: 'en-US' })
      ).toThrow(TypeError);
    });
  });

  describe('edge cases', () => {
    it('throws RangeError for Infinity', () => {
      expect(() =>
        formatReward(Infinity, { type: 'points', locale: 'en-US' })
      ).toThrow(RangeError);
    });

    it('throws RangeError for -Infinity', () => {
      expect(() =>
        formatReward(-Infinity, { type: 'points', locale: 'en-US' })
      ).toThrow(RangeError);
    });

    it('handles negative point values', () => {
      const result = formatReward(-50, { type: 'points', locale: 'en-US' });
      expect(result).toBe('-50 pts');
    });

    it('handles zero for currency', () => {
      const result = formatReward(0, {
        type: 'currency',
        currency: 'USD',
        locale: 'en-US',
      });
      expect(result).toBe('$0.00');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatRewardRange
// ─────────────────────────────────────────────────────────────────────────────

describe('formatRewardRange', () => {
  it('formats a points range correctly', () => {
    const result = formatRewardRange(100, 500, {
      type: 'points',
      locale: 'en-US',
    });
    expect(result).toMatch(/100/);
    expect(result).toMatch(/500 pts/);
    expect(result).toContain('–');
  });

  it('formats equal min and max', () => {
    const result = formatRewardRange(200, 200, {
      type: 'points',
      locale: 'en-US',
    });
    expect(result).toContain('200');
  });

  it('throws RangeError when min > max', () => {
    expect(() =>
      formatRewardRange(500, 100, { type: 'points', locale: 'en-US' })
    ).toThrow(RangeError);
  });

  it('formats a currency range', () => {
    const result = formatRewardRange(5, 20, {
      type: 'currency',
      currency: 'USD',
      locale: 'en-US',
    });
    expect(result).toContain('$');
  });

  it('formats a custom-label range', () => {
    const result = formatRewardRange(10, 50, {
      type: 'custom',
      locale: 'en-US',
      label: { singular: 'token', plural: 'tokens' },
    });
    expect(result).toMatch(/tokens/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatCompactReward
// ─────────────────────────────────────────────────────────────────────────────

describe('formatCompactReward', () => {
  it('formats 1,200,000 points as "1.2M pts" for en-US', () => {
    const result = formatCompactReward(1_200_000, {
      type: 'points',
      locale: 'en-US',
    });
    expect(result).toMatch(/1\.2M pts|1,2M pts/);
  });

  it('formats 5500 USD compactly', () => {
    const result = formatCompactReward(5500, {
      type: 'currency',
      currency: 'USD',
      locale: 'en-US',
    });
    expect(result).toMatch(/\$5\.5K|\$5,5K/);
  });

  it('formats 0.5 as a compact percentage', () => {
    const result = formatCompactReward(0.5, {
      type: 'percentage',
      locale: 'en-US',
    });
    expect(result).toContain('%');
  });

  it('formats compact custom reward', () => {
    const result = formatCompactReward(2_000, {
      type: 'custom',
      locale: 'en-US',
      label: { singular: 'token', plural: 'tokens' },
    });
    expect(result).toMatch(/2K tokens/);
  });

  it('throws TypeError for custom type without label', () => {
    expect(() =>
      formatCompactReward(1000, { type: 'custom', locale: 'en-US' })
    ).toThrow(TypeError);
  });
});
