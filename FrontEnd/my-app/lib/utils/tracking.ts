/**
 * Analytics tracking utilities.
 * - No PII tracked without consent.
 * - Minimal performance impact (fire-and-forget, no blocking).
 */

import type { AnalyticsEventPayload } from '@/lib/analytics/events';

const CONSENT_KEY = 'stellar_earn_analytics_consent';
const CONSENT_VERSION = '1';

export type ConsentStatus = 'granted' | 'denied' | 'pending';

/** Get stored consent. Default is pending (no tracking until user opts in). */
export function getConsent(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return 'pending';
    const { status, version } = JSON.parse(raw) as { status: ConsentStatus; version: string };
    if (version !== CONSENT_VERSION) return 'pending';
    return status;
  } catch {
    return 'pending';
  }
}

/** Persist consent (granted | denied). */
export function setConsent(status: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ status, version: CONSENT_VERSION }));
  } catch {
    // ignore
  }
}

/** Sanitize payload: strip known PII keys. Never send these without explicit consent. */
const PII_KEYS = new Set(['email', 'userId', 'address', 'wallet', 'name', 'ip']);
export function sanitizePayload(payload?: AnalyticsEventPayload): AnalyticsEventPayload | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const out: AnalyticsEventPayload = {};
  for (const [k, v] of Object.entries(payload)) {
    const keyLower = k.toLowerCase();
    if (PII_KEYS.has(keyLower)) continue;
    if (v !== undefined && v !== null) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Check if we're in analytics test mode (no real tracking). */
export function isAnalyticsTestMode(): boolean {
  if (typeof window === 'undefined') return true;
  return process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE === 'true';
}

/** In-memory aggregate for admin dashboard (no PII). */
const pageViewCounts: Record<string, number> = {};
const eventCounts: Record<string, number> = {};

export function recordPageViewForAdmin(path: string): void {
  if (typeof window === 'undefined') return;
  pageViewCounts[path] = (pageViewCounts[path] ?? 0) + 1;
}

export function recordEventForAdmin(name: string): void {
  if (typeof window === 'undefined') return;
  eventCounts[name] = (eventCounts[name] ?? 0) + 1;
}

export interface AdminAnalyticsSnapshot {
  pageViews: Record<string, number>;
  events: Record<string, number>;
  totalPageViews: number;
  totalEvents: number;
}

/** Get current snapshot for admin dashboard (client-only). */
export function getAdminAnalyticsSnapshot(): AdminAnalyticsSnapshot {
  const pageViews = { ...pageViewCounts };
  const events = { ...eventCounts };
  const totalPageViews = Object.values(pageViews).reduce((a, b) => a + b, 0);
  const totalEvents = Object.values(events).reduce((a, b) => a + b, 0);
  return { pageViews, events, totalPageViews, totalEvents };
}
