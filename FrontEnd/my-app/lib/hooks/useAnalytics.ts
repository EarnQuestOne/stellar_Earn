'use client';

import { useCallback, useContext } from 'react';
import { ANALYTICS_EVENTS, type AnalyticsEventName, type AnalyticsEventPayload } from '@/lib/analytics/events';
import { sanitizePayload } from '@/lib/utils/tracking';
import { AnalyticsContext } from '@/app/providers/AnalyticsProvider';

/**
 * Custom hook for analytics tracking.
 * - Respects user consent (no tracking if denied).
 * - Sanitizes payload (no PII without consent).
 * - Minimal performance impact.
 */
export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    return {
      trackEvent: () => {},
      trackPageView: () => {},
      consentStatus: 'pending' as const,
      setConsent: () => {},
      isTestMode: () => true,
      hasConsent: false,
    };
  }

  const { trackEvent: ctxTrack, trackPageView: ctxPageView, consentStatus, setConsent, isTestMode } = ctx;
  const hasConsent = consentStatus === 'granted';

  const trackEvent = useCallback(
    (name: AnalyticsEventName | string, payload?: AnalyticsEventPayload) => {
      if (!hasConsent) return;
      const safe = sanitizePayload(payload);
      ctxTrack(name, safe);
    },
    [hasConsent, ctxTrack],
  );

  const trackPageView = useCallback(
    (path: string, title?: string) => {
      if (!hasConsent) return;
      ctxPageView(path, title);
    },
    [hasConsent, ctxPageView],
  );

  return {
    trackEvent,
    trackPageView,
    consentStatus,
    setConsent,
    isTestMode,
    hasConsent,
    ANALYTICS_EVENTS,
  };
}
