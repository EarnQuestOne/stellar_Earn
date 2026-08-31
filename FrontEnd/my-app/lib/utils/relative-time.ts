/**
 * @file relative-time.ts
 * @description Shared, i18n-aware relative-time formatting utility.
 *
 * Uses the native `Intl.RelativeTimeFormat` API — no external dependencies.
 * Centralises the "3 minutes ago" / "in 2 days" logic so that every
 * consumer (RewardHistory, NotificationItem, ActiveQuests, etc.) stays
 * consistent and drift-free.
 *
 * @example
 * import { formatRelativeTime } from '@/lib/utils/relative-time';
 *
 * formatRelativeTime('2026-05-27T10:00:00Z');
 * // → "2 days ago" (en-US) / "il y a 2 jours" (fr-FR)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelativeTimeOptions {
  /**
   * BCP-47 locale string (e.g. `'en-US'`, `'fr-FR'`).
   * Defaults to the browser / runtime locale via `Intl.DateTimeFormat().resolvedOptions().locale`.
   */
  locale?: string;
  /**
   * Reference point in milliseconds since epoch (defaults to `Date.now()`).
   * Primarily useful for deterministic testing.
   */
  now?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Thresholds in seconds for each relative-time unit. */
const SECOND = 1;
const MINUTE = 60;
const HOUR = 3_600;
const DAY = 86_400;
const WEEK = 604_800;
const MONTH = 2_592_000;
const YEAR = 31_536_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a `Date` from various input types.
 * Returns `null` when the input cannot be parsed into a valid date.
 */
function toDate(input: Date | number | string): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    if (!isFinite(input)) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Resolve the locale string, falling back to the runtime default.
 */
function resolveLocale(locale?: string): string {
  if (locale) return locale;
  return Intl.DateTimeFormat().resolvedOptions().locale;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a date as a locale-aware relative-time string.
 *
 * Uses `Intl.RelativeTimeFormat` under the hood, so output is correct for
 * every supported locale — no hardcoded English strings.
 *
 * Covers units from seconds through years. Dates in the future produce
 * strings like `"in 3 hours"`, while past dates produce `"5 minutes ago"`.
 *
 * @param input  - A `Date`, Unix timestamp (ms), or ISO-8601 string.
 * @param options - Optional locale and reference-point overrides.
 * @returns A human-readable relative-time string, or `'N/A'` for invalid input.
 *
 * @example
 * // 2 hours ago
 * formatRelativeTime(Date.now() - 2 * 60 * 60 * 1000);
 * // → "2 hours ago"
 *
 * @example
 * // 3 days from now (French)
 * formatRelativeTime(Date.now() + 3 * 86_400_000, { locale: 'fr-FR' });
 * // → "dans 3 jours"
 */
export function formatRelativeTime(
  input: Date | number | string,
  options: RelativeTimeOptions = {}
): string {
  const { locale, now = Date.now() } = options;

  const date = toDate(input);
  if (!date) return 'N/A';

  const resolvedLocale = resolveLocale(locale);
  const formatter = new Intl.RelativeTimeFormat(resolvedLocale, {
    numeric: 'auto',
  });

  const diffMs = date.getTime() - now;
  const diffSec = Math.round(diffMs / 1_000);
  const absSec = Math.abs(diffSec);

  if (absSec < MINUTE) return formatter.format(diffSec, 'second');
  if (absSec < HOUR)
    return formatter.format(Math.round(diffSec / MINUTE), 'minute');
  if (absSec < DAY) return formatter.format(Math.round(diffSec / HOUR), 'hour');
  if (absSec < WEEK) return formatter.format(Math.round(diffSec / DAY), 'day');
  if (absSec < MONTH)
    return formatter.format(Math.round(diffSec / WEEK), 'week');
  if (absSec < YEAR)
    return formatter.format(Math.round(diffSec / MONTH), 'month');
  return formatter.format(Math.round(diffSec / YEAR), 'year');
}
