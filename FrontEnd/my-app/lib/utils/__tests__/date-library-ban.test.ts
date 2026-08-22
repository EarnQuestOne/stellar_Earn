/**
 * Regression guard: heavy date libraries must never enter the client bundle.
 *
 * All date parsing/formatting goes through the native-Intl utilities in
 * `lib/utils/date.ts` and `lib/utils/i18n-formatters.ts` (0 KB of library
 * code). This suite fails the build if moment (≈72 KB min, ≈295 KB with
 * locales), moment-timezone, dayjs, or luxon is added as a direct dependency
 * or sneaks in transitively via the lockfile.
 *
 * Complements the `no-restricted-imports` ESLint rule in `eslint.config.mjs`,
 * which blocks source-level imports of the same packages.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const BANNED_DATE_PACKAGES = [
  'moment',
  'moment-timezone',
  'dayjs',
  'luxon',
] as const;

const appRoot = path.resolve(__dirname, '../../..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

describe('heavy date library ban', () => {
  it('package.json declares no heavy date libraries', () => {
    const pkg = readJson<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>('package.json');

    const declared = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const banned of BANNED_DATE_PACKAGES) {
      expect(
        declared[banned],
        `"${banned}" must not be a dependency — use the Intl-based helpers in lib/utils/date.ts or lib/utils/i18n-formatters.ts`
      ).toBeUndefined();
    }
  });

  it('lockfile contains no heavy date libraries (including transitive)', () => {
    const lock = readJson<{
      packages?: Record<string, unknown>;
    }>('package-lock.json');

    const installedPaths = Object.keys(lock.packages ?? {});

    for (const banned of BANNED_DATE_PACKAGES) {
      const offenders = installedPaths.filter(
        (p) => p === `node_modules/${banned}` || p.endsWith(`/${banned}`)
      );
      expect(
        offenders,
        `"${banned}" was found in package-lock.json (${offenders.join(', ')}) — remove the dependency that pulls it in`
      ).toEqual([]);
    }
  });

  it('Intl-based date utilities remain the formatting entry points', async () => {
    // Sanity check that the sanctioned utilities exist and work, so the ban
    // never leaves the app without a formatting path.
    const dateUtils = await import('../date');
    const i18nFormatters = await import('../i18n-formatters');

    expect(typeof dateUtils.formatDate).toBe('function');
    expect(typeof dateUtils.parseDate).toBe('function');
    expect(typeof i18nFormatters.formatDate).toBe('function');

    const formatted = dateUtils.formatDate('2026-05-30T14:30:00Z');
    expect(formatted).toBeTruthy();
    expect(formatted).not.toBe('Invalid Date');
  });
});
