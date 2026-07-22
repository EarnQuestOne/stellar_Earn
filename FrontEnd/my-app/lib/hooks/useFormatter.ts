/**
 * @file useFormatter.ts
 * @description React hook that returns memoised, locale-bound formatting
 * functions from `@/lib/utils/i18n-formatters`.
 *
 * Reads `navigator.language` once per component instance so every returned
 * helper already has the locale pre-bound — no locale prop drilling needed.
 */

'use client';

import { useMemo } from 'react';
import {
  formatDate,
  formatDeadline,
  formatReward,
  formatCompactReward,
  type DateFormatStyle,
  type RewardFormatOptions,
} from '@/lib/utils/i18n-formatters';

/** A date value accepted by the formatting helpers. */
type DateValue = Date | number | string;

interface FormatterFns {
  /**
   * Formats a date value using the given style (defaults to `'medium'`).
   *
   * @example
   * date(quest.createdAt, 'medium')  // → "May 30, 2026"
   * date(timestamp, 'relative')      // → "3 days ago"
   */
  date: (value: DateValue, style?: DateFormatStyle) => string;

  /**
   * Formats a deadline as a human-friendly label:
   * "Ends in 3 days" for future deadlines, "Expired" for past ones.
   *
   * @example
   * deadline(quest.deadline) // → "Ends in 3 days" | "Expired"
   */
  deadline: (value: DateValue) => string;

  /**
   * Formats a reward amount with locale-correct digit grouping and labels.
   * Accepts `string | number` — strings are coerced via `Number()`.
   *
   * @example
   * reward(1200, { type: 'points' })
   * // → "1,200 pts"
   */
  reward: (value: number | string, options: RewardFormatOptions) => string;

  /**
   * Compact reward formatting (e.g. "1.2K XLM") — ideal for badges.
   * Accepts `string | number` — strings are coerced via `Number()`.
   *
   * @example
   * compactReward(1_200_000, { type: 'points' })
   * // → "1.2M pts"
   */
  compactReward: (
    value: number | string,
    options: RewardFormatOptions
  ) => string;
}

/**
 * Returns memoised, locale-bound formatting helpers.
 *
 * The locale is resolved once from `navigator.language` (or `'en-US'` during
 * SSR) and baked into every returned function so callers never need to pass
 * a locale explicitly.
 */
export function useFormatter(): FormatterFns {
  return useMemo<FormatterFns>(() => {
    const locale =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US';

    return {
      date: (value, style = 'medium') => formatDate(value, { style, locale }),

      deadline: (value) => formatDeadline(value, { locale }),

      reward: (value, options) =>
        formatReward(Number(value), { ...options, locale }),

      compactReward: (value, options) =>
        formatCompactReward(Number(value), { ...options, locale }),
    };
  }, []);
}
