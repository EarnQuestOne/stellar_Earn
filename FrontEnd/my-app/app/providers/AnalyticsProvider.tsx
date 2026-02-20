'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getAnalyticsProvider } from '@/lib/analytics/provider';
import { getConsent, setConsent as setConsentStorage, isAnalyticsTestMode, type ConsentStatus } from '@/lib/utils/tracking';
import { recordEventForAdmin, recordPageViewForAdmin } from '@/lib/utils/tracking';

export interface AnalyticsContextValue {
  trackEvent: (name: string, payload?: Record<string, string | number | boolean | undefined | null>) => void;
  trackPageView: (path: string, title?: string) => void;
  consentStatus: ConsentStatus;
  setConsent: (status: 'granted' | 'denied') => void;
  isTestMode: () => boolean;
}

export const AnalyticsContext = React.createContext<AnalyticsContextValue | null>(null);

function AnalyticsProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [consentStatus, setConsentState] = useState<ConsentStatus>('pending');

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  const setConsent = useCallback((status: 'granted' | 'denied') => {
    setConsentStorage(status);
    setConsentState(status);
  }, []);

  const hasConsent = consentStatus === 'granted';
  const provider = useMemo(() => getAnalyticsProvider(hasConsent), [hasConsent]);

  const trackPageView = useCallback(
    (path: string, title?: string) => {
      if (hasConsent) {
        provider.trackPageView(path, title);
        recordPageViewForAdmin(path);
      }
    },
    [hasConsent, provider],
  );

  const trackEvent = useCallback(
    (name: string, payload?: Record<string, string | number | boolean | undefined | null>) => {
      if (hasConsent) {
        provider.trackEvent(name, payload);
        recordEventForAdmin(name);
      }
    },
    [hasConsent, provider],
  );

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname, document.title || pathname);
  }, [pathname, trackPageView]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      trackEvent,
      trackPageView,
      consentStatus,
      setConsent,
      isTestMode: isAnalyticsTestMode,
    }),
    [trackEvent, trackPageView, consentStatus, setConsent],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <AnalyticsProviderInner>{children}</AnalyticsProviderInner>;
}
