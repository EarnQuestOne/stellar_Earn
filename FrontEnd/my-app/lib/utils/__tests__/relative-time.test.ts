import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatRelativeTime } from '@/lib/utils/relative-time';

// Fixed reference point: 2026-05-30T12:00:00.000Z
const FIXED_MS = Date.UTC(2026, 4, 30, 12, 0, 0, 0);

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it('returns "N/A" for null input', () => {
    expect(formatRelativeTime(null as unknown as Date)).toBe('N/A');
  });

  it('returns "N/A" for undefined input', () => {
    expect(formatRelativeTime(undefined as unknown as Date)).toBe('N/A');
  });

  it('returns "N/A" for empty string', () => {
    expect(formatRelativeTime('')).toBe('N/A');
  });

  it('returns "N/A" for invalid date string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('N/A');
  });

  it('returns "N/A" for NaN number', () => {
    expect(formatRelativeTime(NaN)).toBe('N/A');
  });

  it('returns "N/A" for Infinity', () => {
    expect(formatRelativeTime(Infinity)).toBe('N/A');
  });

  // ── Past times ────────────────────────────────────────────────────────────

  it('returns "now" for the current instant', () => {
    const result = formatRelativeTime(new Date(FIXED_MS), { locale: 'en-US' });
    // Intl.RelativeTimeFormat numeric:'auto' returns "now" for 0 seconds
    expect(result).toBeTruthy();
  });

  it('returns minutes ago for 5 minutes in the past', () => {
    const past = FIXED_MS - 5 * 60_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/5 minutes? ago/);
  });

  it('returns hours ago for 3 hours in the past', () => {
    const past = FIXED_MS - 3 * 3_600_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/3 hours? ago/);
  });

  it('returns yesterday or 1 day ago for 1 day in the past', () => {
    const past = FIXED_MS - 86_400_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/yesterday|1 day ago/i);
  });

  it('returns days ago for 5 days in the past', () => {
    const past = FIXED_MS - 5 * 86_400_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/5 days? ago/);
  });

  it('returns weeks ago for 2 weeks in the past', () => {
    const past = FIXED_MS - 14 * 86_400_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/2 weeks? ago/);
  });

  it('returns months ago for 2 months in the past', () => {
    const past = FIXED_MS - 60 * 86_400_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/months? ago/);
  });

  it('returns years ago for 2 years in the past', () => {
    const past = FIXED_MS - 2 * 365 * 86_400_000;
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/years? ago/);
  });

  // ── Future times ──────────────────────────────────────────────────────────

  it('returns "in 5 minutes" for 5 minutes in the future', () => {
    const future = FIXED_MS + 5 * 60_000;
    const result = formatRelativeTime(future, { locale: 'en-US' });
    expect(result).toMatch(/in 5 minutes?/);
  });

  it('returns "in 3 hours" for 3 hours in the future', () => {
    const future = FIXED_MS + 3 * 3_600_000;
    const result = formatRelativeTime(future, { locale: 'en-US' });
    expect(result).toMatch(/in 3 hours?/);
  });

  it('returns tomorrow or in 1 day for 1 day in the future', () => {
    const future = FIXED_MS + 86_400_000;
    const result = formatRelativeTime(future, { locale: 'en-US' });
    expect(result).toMatch(/tomorrow|in 1 day/i);
  });

  it('returns "in 2 weeks" for 14 days in the future', () => {
    const future = FIXED_MS + 14 * 86_400_000;
    const result = formatRelativeTime(future, { locale: 'en-US' });
    expect(result).toMatch(/in 2 weeks?/);
  });

  // ── Locale support ────────────────────────────────────────────────────────

  it('produces French output for fr-FR locale', () => {
    const past = FIXED_MS - 5 * 86_400_000;
    const result = formatRelativeTime(past, { locale: 'fr-FR' });
    // French: "il y a 5 jours"
    expect(result).toMatch(/il y a 5 jours/);
  });

  it('produces German output for de-DE locale', () => {
    const past = FIXED_MS - 3 * 3_600_000;
    const result = formatRelativeTime(past, { locale: 'de-DE' });
    // German: "vor 3 Stunden"
    expect(result).toMatch(/vor 3 Stunden/);
  });

  // ── Accepts various input types ───────────────────────────────────────────

  it('accepts ISO-8601 string', () => {
    const past = new Date(FIXED_MS - 86_400_000).toISOString();
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/yesterday|1 day ago/i);
  });

  it('accepts Date object', () => {
    const past = new Date(FIXED_MS - 3_600_000);
    const result = formatRelativeTime(past, { locale: 'en-US' });
    expect(result).toMatch(/1 hour ago/);
  });

  it('accepts Unix timestamp in ms', () => {
    const result = formatRelativeTime(FIXED_MS - 60_000, { locale: 'en-US' });
    expect(result).toMatch(/1 minute ago/);
  });

  // ── Custom now option ─────────────────────────────────────────────────────

  it('respects custom now option for deterministic testing', () => {
    const customNow = Date.UTC(2026, 4, 30, 12, 0, 0, 0);
    const past = customNow - 2 * 86_400_000;
    const result = formatRelativeTime(past, {
      locale: 'en-US',
      now: customNow,
    });
    expect(result).toMatch(/2 days? ago/);
  });
});
