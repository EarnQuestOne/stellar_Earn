/**
 * @file i18n-formatters.ts
 * @description i18n-ready formatting utilities for date and reward strings.
 *
 * Built on the native `Intl` API — no external dependencies required.
 * All functions accept an optional `locale` parameter (defaults to the
 * browser/runtime locale) so they work correctly for every user regardless
 * of their region or language setting.
 *
 * Usage:
 *   import { formatDate, formatReward } from '@/lib/utils/i18n-formatters';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Reward types supported by the formatter. */
export type RewardType = 'points' | 'currency' | 'percentage' | 'custom';

export interface RewardFormatOptions {
  /** The type of reward value to format. */
  type: RewardType;
  /**
   * ISO 4217 currency code (e.g. 'USD', 'EUR', 'NGN').
   * Required when `type` is `'currency'`.
   */
  currency?: string;
  /**
   * Singular and plural labels used when `type` is `'points'` or `'custom'`.
   * Defaults to `{ singular: 'pt', plural: 'pts' }` for points.
   *
   * @example { singular: 'token', plural: 'tokens' }
   */
  label?: { singular: string; plural: string };
  /**
   * Locale string (e.g. 'en-US', 'fr-FR').
   * Defaults to the runtime/browser locale.
   */
  locale?: string;
  /**
   * Maximum number of fraction digits to display.
   * Defaults: 0 for points, 2 for currency, 1 for percentage.
   */
  maximumFractionDigits?: number;
}

/** Preset date format styles mirroring `Intl.DateTimeFormatOptions`. */
export type DateFormatStyle =
  | 'short' // 30/05/2026
  | 'medium' // May 30, 2026
  | 'long' // Saturday, May 30, 2026
  | 'relative' // "2 days ago", "in 3 hours"
  | 'time' // 14:30
  | 'datetime' // May 30, 2026, 14:30
  | 'iso'; // 2026-05-30T14:30:00.000Z (locale-independent)

export interface DateFormatOptions {
  /** Preset style. Defaults to `'medium'`. */
  style?: DateFormatStyle;
  /**
   * Locale string (e.g. 'en-US', 'ar-SA').
   * Defaults to the runtime/browser locale.
   */
  locale?: string;
  /**
   * IANA timezone string (e.g. 'America/New_York', 'Africa/Lagos').
   * Defaults to the runtime timezone.
   */
  timeZone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the locale to use, falling back through:
 * 1. Explicitly supplied locale
 * 2. Browser `navigator.language`
 * 3. Hard-coded 'en-US' as a safe SSR default
 */
function resolveLocale(locale?: string): string {
  if (locale) return locale;
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

/**
 * Coerces the input to a `Date` object.
 * Accepts a `Date`, a Unix timestamp (number), or an ISO-8601 string.
 *
 * @throws {RangeError} when the resulting Date is invalid.
 */
function toDate(value: Date | number | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    throw new RangeError(
      `[i18n-formatters] Invalid date value: "${value}". ` +
        'Provide a Date object, a Unix timestamp, or an ISO-8601 string.'
    );
  }
  return date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date formatting
// ─────────────────────────────────────────────────────────────────────────────

/** Maps `DateFormatStyle` presets to `Intl.DateTimeFormatOptions`. */
const DATE_FORMAT_PRESETS: Record<
  Exclude<DateFormatStyle, 'relative' | 'iso'>,
  Intl.DateTimeFormatOptions
> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'long', year: 'numeric' },
  long: {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
  time: { hour: '2-digit', minute: '2-digit' },
  datetime: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
};

/**
 * Formats a date value into a localised string.
 *
 * @param value  - Date | Unix timestamp (ms) | ISO-8601 string
 * @param options - Formatting options
 * @returns A localised date string
 *
 * @example
 * formatDate(new Date(), { style: 'medium', locale: 'fr-FR' })
 * // → "30 mai 2026"
 *
 * formatDate('2026-05-30', { style: 'relative', locale: 'en-US' })
 * // → "today"
 *
 * formatDate(1748649600000, { style: 'short', locale: 'de-DE' })
 * // → "30.05.2026"
 */
export function formatDate(
  value: Date | number | string,
  options: DateFormatOptions = {}
): string {
  const { style = 'medium', locale, timeZone } = options;
  const resolvedLocale = resolveLocale(locale);
  const date = toDate(value);

  // ISO is locale-independent
  if (style === 'iso') {
    return date.toISOString();
  }

  // Relative formatting via Intl.RelativeTimeFormat
  if (style === 'relative') {
    return formatRelativeDate(date, resolvedLocale);
  }

  const intlOptions: Intl.DateTimeFormatOptions = {
    ...DATE_FORMAT_PRESETS[style],
    ...(timeZone ? { timeZone } : {}),
  };

  return new Intl.DateTimeFormat(resolvedLocale, intlOptions).format(date);
}

/**
 * Internal helper: formats a date as a relative string (e.g. "3 days ago").
 * Uses second → minute → hour → day → week → month → year thresholds.
 */
function formatRelativeDate(date: Date, locale: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffSec = Math.round(diffMs / 1_000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return formatter.format(diffSec, 'second');
  if (absSec < 3_600)
    return formatter.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86_400)
    return formatter.format(Math.round(diffSec / 3_600), 'hour');
  if (absSec < 604_800)
    return formatter.format(Math.round(diffSec / 86_400), 'day');
  if (absSec < 2_592_000)
    return formatter.format(Math.round(diffSec / 604_800), 'week');
  if (absSec < 31_536_000)
    return formatter.format(Math.round(diffSec / 2_592_000), 'month');
  return formatter.format(Math.round(diffSec / 31_536_000), 'year');
}

/**
 * Formats a quest deadline date with a human-friendly label.
 *
 * Returns `'Expired'` (localised) for past deadlines,
 * or a relative string like `'Ends in 3 days'` for future deadlines.
 *
 * @example
 * formatDeadline('2026-06-02', { locale: 'en-US' }) // → "Ends in 3 days"
 * formatDeadline('2026-01-01', { locale: 'en-US' }) // → "Expired"
 */
export function formatDeadline(
  value: Date | number | string,
  options: DateFormatOptions = {}
): string {
  const { locale } = options;
  const resolvedLocale = resolveLocale(locale);
  const date = toDate(value);
  const now = Date.now();

  if (date.getTime() < now) {
    // Localise the "Expired" label using DisplayNames as a fallback approach
    const expiredLabels: Record<string, string> = {
      fr: 'Expiré',
      de: 'Abgelaufen',
      es: 'Expirado',
      pt: 'Expirado',
      ar: 'منتهية الصلاحية',
      zh: '已过期',
      ja: '期限切れ',
    };
    const lang = resolvedLocale.split('-')[0];
    return expiredLabels[lang] ?? 'Expired';
  }

  const relative = formatRelativeDate(date, resolvedLocale);

  // Prefix with "Ends " / locale equivalent
  const prefixes: Record<string, string> = {
    fr: `Se termine ${relative}`,
    de: `Endet ${relative}`,
    es: `Termina ${relative}`,
    pt: `Termina ${relative}`,
    ar: `ينتهي ${relative}`,
    zh: `结束于${relative}`,
    ja: `終了：${relative}`,
  };
  const lang = resolvedLocale.split('-')[0];
  return prefixes[lang] ?? `Ends ${relative}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reward formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a numeric reward value into a localised display string.
 *
 * Supports four reward types:
 * - `'points'`     → "1,200 pts" (locale-formatted number + label)
 * - `'currency'`   → "$5.00" / "€5,00" (Intl.NumberFormat currency)
 * - `'percentage'` → "10%" (Intl.NumberFormat percent)
 * - `'custom'`     → "500 tokens" (locale-formatted number + custom label)
 *
 * @example
 * formatReward(1200, { type: 'points', locale: 'en-US' })
 * // → "1,200 pts"
 *
 * formatReward(5.5, { type: 'currency', currency: 'USD', locale: 'en-US' })
 * // → "$5.50"
 *
 * formatReward(0.1, { type: 'percentage', locale: 'de-DE' })
 * // → "10 %"
 *
 * formatReward(500, {
 *   type: 'custom',
 *   label: { singular: 'token', plural: 'tokens' },
 *   locale: 'en-US',
 * })
 * // → "500 tokens"
 */
export function formatReward(
  value: number,
  options: RewardFormatOptions
): string {
  const { type, currency, label, locale, maximumFractionDigits } = options;

  if (!isFinite(value)) {
    throw new RangeError(
      `[i18n-formatters] Reward value must be a finite number, got: ${value}`
    );
  }

  const resolvedLocale = resolveLocale(locale);

  switch (type) {
    case 'currency': {
      if (!currency) {
        throw new TypeError(
          '[i18n-formatters] `currency` option is required when type is "currency".'
        );
      }
      return new Intl.NumberFormat(resolvedLocale, {
        style: 'currency',
        currency,
        maximumFractionDigits: maximumFractionDigits ?? 2,
      }).format(value);
    }

    case 'percentage': {
      return new Intl.NumberFormat(resolvedLocale, {
        style: 'percent',
        maximumFractionDigits: maximumFractionDigits ?? 1,
      }).format(value);
    }

    case 'points': {
      const formattedNumber = new Intl.NumberFormat(resolvedLocale, {
        maximumFractionDigits: maximumFractionDigits ?? 0,
      }).format(value);

      const defaultLabel = label ?? { singular: 'pt', plural: 'pts' };
      const unitLabel =
        Math.abs(value) === 1 ? defaultLabel.singular : defaultLabel.plural;

      return `${formattedNumber} ${unitLabel}`;
    }

    case 'custom': {
      if (!label) {
        throw new TypeError(
          '[i18n-formatters] `label` option is required when type is "custom".'
        );
      }
      const formattedNumber = new Intl.NumberFormat(resolvedLocale, {
        maximumFractionDigits: maximumFractionDigits ?? 0,
      }).format(value);
      const unitLabel = Math.abs(value) === 1 ? label.singular : label.plural;
      return `${formattedNumber} ${unitLabel}`;
    }

    default: {
      // TypeScript exhaustive check
      const _exhaustive: never = type;
      throw new TypeError(
        `[i18n-formatters] Unknown reward type: "${_exhaustive}"`
      );
    }
  }
}

/**
 * Formats a reward range (min–max) into a single localised string.
 *
 * @example
 * formatRewardRange(100, 500, { type: 'points', locale: 'en-US' })
 * // → "100 – 500 pts"
 *
 * formatRewardRange(5, 20, { type: 'currency', currency: 'USD', locale: 'en-US' })
 * // → "$5.00 – $20.00"
 */
export function formatRewardRange(
  min: number,
  max: number,
  options: RewardFormatOptions
): string {
  if (min > max) {
    throw new RangeError(
      `[i18n-formatters] min (${min}) must not exceed max (${max}).`
    );
  }
  // For currency / percentage use Intl.NumberFormat.formatRange where available
  if (
    (options.type === 'currency' || options.type === 'percentage') &&
    typeof Intl.NumberFormat.prototype.formatRange === 'function'
  ) {
    const resolvedLocale = resolveLocale(options.locale);
    const nfOptions: Intl.NumberFormatOptions =
      options.type === 'currency'
        ? { style: 'currency', currency: options.currency! }
        : {
            style: 'percent',
            maximumFractionDigits: options.maximumFractionDigits ?? 1,
          };

    return new Intl.NumberFormat(resolvedLocale, nfOptions).formatRange(
      min,
      max
    );
  }

  const formattedMin = formatReward(min, options);
  const formattedMax = formatReward(max, options);
  // Strip the unit from the min value to avoid duplication for points/custom
  if (options.type === 'points' || options.type === 'custom') {
    const resolvedLocale = resolveLocale(options.locale);
    const formattedMinNum = new Intl.NumberFormat(resolvedLocale, {
      maximumFractionDigits: options.maximumFractionDigits ?? 0,
    }).format(min);
    return `${formattedMinNum} – ${formattedMax}`;
  }
  return `${formattedMin} – ${formattedMax}`;
}

/**
 * Formats a compact reward number for tight UI spaces (e.g. card badges).
 *
 * @example
 * formatCompactReward(1_200_000, { type: 'points', locale: 'en-US' })
 * // → "1.2M pts"
 *
 * formatCompactReward(5500, { type: 'currency', currency: 'USD', locale: 'en-US' })
 * // → "$5.5K"
 */
export function formatCompactReward(
  value: number,
  options: RewardFormatOptions
): string {
  const resolvedLocale = resolveLocale(options.locale);

  if (options.type === 'currency') {
    if (!options.currency) {
      throw new TypeError(
        '[i18n-formatters] `currency` option is required when type is "currency".'
      );
    }
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: options.currency,
      notation: 'compact',
      maximumFractionDigits: options.maximumFractionDigits ?? 1,
    }).format(value);
  }

  const compactNumber = new Intl.NumberFormat(resolvedLocale, {
    notation: 'compact',
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  }).format(value);

  if (options.type === 'percentage') {
    // Compact percentage: just append %
    return `${compactNumber}%`;
  }

  // Points or custom
  const label =
    options.label ??
    (options.type === 'points' ? { singular: 'pt', plural: 'pts' } : null);

  if (!label) {
    throw new TypeError(
      '[i18n-formatters] `label` option is required when type is "custom".'
    );
  }
  // Use plural for compact (e.g. "1.2M pts")
  return `${compactNumber} ${label.plural}`;
}
