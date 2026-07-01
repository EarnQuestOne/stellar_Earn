'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { AnalyticsProvider } from './AnalyticsProvider';
import { HydrationBoundary } from './HydrationBoundary';
import { WalletProvider } from '@/context/WalletContext';
import { ToastProvider } from '@/components/notifications/Toast';
import { AppErrorBoundary } from '@/components/error/ErrorBoundary';
import { A11yAnnouncerProvider } from '@/components/a11y/A11yAnnouncer';
import { OfflineModeProvider } from '@/components/providers/OfflineModeProvider';

/**
 * RootProviders Component
 *
 * Combines all client-side providers with safe hydration checks.
 * This ensures:
 * - No hydration mismatches from localStorage/window access
 * - Proper ordering of context providers
 * - Safe initialization of async providers
 * - Better error handling with boundaries
 *
 * All providers are wrapped in HydrationBoundary to ensure
 * they only render after client hydration is complete.
 *
 * Provider Hierarchy:
 * 1. HydrationBoundary - Prevents hydration mismatches
 * 2. ThemeProvider - Theme management
 * 3. AppErrorBoundary - Error boundary for the app
 * 4. ToastProvider - Toast notifications
 * 5. WalletProvider - Stellar wallet integration
 * 6. AuthProvider - Authentication state
 * 7. AnalyticsProvider - Analytics tracking
 * 8. A11yAnnouncerProvider - Accessibility announcements
 */
interface RootProvidersProps {
  children: ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
  return (
    <HydrationBoundary>
      <ThemeProvider>
        <AppErrorBoundary>
          <ToastProvider>
            <WalletProvider>
              <AuthProvider>
                <AnalyticsProvider>
                  <OfflineModeProvider>
                    <A11yAnnouncerProvider>{children}</A11yAnnouncerProvider>
                  </OfflineModeProvider>
                </AnalyticsProvider>
              </AuthProvider>
            </WalletProvider>
          </ToastProvider>
        </AppErrorBoundary>
      </ThemeProvider>
    </HydrationBoundary>
  );
}
