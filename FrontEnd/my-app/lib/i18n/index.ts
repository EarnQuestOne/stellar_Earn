export { locales, defaultLocale, localeNames } from './config';
export type { Locale, Messages } from './config';

/**
 * Locale cookie configuration for next-intl middleware.
 *
 * The middleware writes a `NEXT_LOCALE` cookie so the user's language
 * choice persists across visits.  Without this option the cookie is
 * never set and the locale resets to the default on every request.
 */
export const localeCookie = {
  name: 'NEXT_LOCALE',
  maxAge: 31_536_000, // 1 year
  sameSite: 'lax' as const,
};
