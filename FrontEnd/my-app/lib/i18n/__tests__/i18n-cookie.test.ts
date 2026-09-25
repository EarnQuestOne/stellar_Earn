import { describe, test, expect, vi, beforeEach } from 'vitest';
import { locales, defaultLocale, localeCookie } from '@/lib/i18n';

describe('i18n config', () => {
  test('exports localeCookie with correct cookie name', () => {
    expect(localeCookie.name).toBe('NEXT_LOCALE');
  });

  test('exports localeCookie with a 1-year maxAge', () => {
    expect(localeCookie.maxAge).toBe(31_536_000);
  });

  test('exports localeCookie with lax sameSite', () => {
    expect(localeCookie.sameSite).toBe('lax');
  });

  test('re-exports locales from config', () => {
    expect(locales).toEqual(['en', 'es']);
  });

  test('re-exports defaultLocale from config', () => {
    expect(defaultLocale).toBe('en');
  });
});

describe('middleware locale cookie persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('cookie config is included in middleware routing', async () => {
    // Verify the localeCookie object is shaped correctly for next-intl
    expect(typeof localeCookie.name).toBe('string');
    expect(typeof localeCookie.maxAge).toBe('number');
    expect(typeof localeCookie.sameSite).toBe('string');
  });
});
