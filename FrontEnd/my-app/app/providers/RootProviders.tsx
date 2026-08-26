'use client';

import React, { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { AnalyticsProvider } from './AnalyticsProvider';
import { HydrationBoundary } from './HydrationBoundary';
import { WalletProvider } from '@/context/WalletContext';
import { ToastProvider } from '@/components/notifications/Toast';
import { AppErrorBoundary } from '@/components/error/ErrorBoundary';
import { A11yAnnouncerProvider } from '@/components/a11y/A11yAnnouncer';
import { OfflineModeProvider } from '@/components/providers/OfflineModeProvider';
import { queryClient } from '@/lib/query/client';

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
 * 3. QueryClientProvider - React Query shared cache
 * 4. AppErrorBoundary - Error boundary for the app
 * 5. ToastProvider - Toast notifications
 * 6. WalletProvider - Stellar wallet integration
 * 7. AuthProvider - Authentication state
 * 8. AnalyticsProvider - Analytics tracking
 * 9. A11yAnnouncerProvider - Accessibility announcements
 */
interface RootProvidersProps {
  children: ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
  return (
    <HydrationBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </ThemeProvider>
    </HydrationBoundary>
  );
}
