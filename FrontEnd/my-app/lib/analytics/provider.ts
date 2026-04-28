/**
 * Analytics provider interface.
 * Implement for GA, Mixpanel, etc. Respects consent and test mode.
 */

import type { AnalyticsEventPayload } from './events';
import { env } from '@/lib/config/env';

export interface AnalyticsProvider {
  trackPageView(path: string, title?: string): void;
  trackEvent(name: string, payload?: AnalyticsEventPayload): void;
  isTestMode(): boolean;
}

export function createNoopProvider(): AnalyticsProvider {
  return {
    trackPageView() {},
    trackEvent() {},
    isTestMode: () => true,
  };
}

export function createConsoleProvider(): AnalyticsProvider {
  return {
    trackPageView(path: string, title?: string) {
      if (typeof window !== 'undefined' && env.isDevelopment) {
        console.debug('[Analytics] page_view', { path, title });
      }
    },
    trackEvent(name: string, payload?: AnalyticsEventPayload) {
      if (typeof window !== 'undefined' && env.isDevelopment) {
        console.debug('[Analytics] event', name, payload ?? {});
      }
    },
    isTestMode: () => true,
  };
}

export function getAnalyticsProvider(_hasConsent: boolean): AnalyticsProvider {
  const testMode = typeof window !== 'undefined' && env.analyticsTestMode();
  if (testMode) return createConsoleProvider();
  return createConsoleProvider();
}
