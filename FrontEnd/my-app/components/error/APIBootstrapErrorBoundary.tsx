'use client';

import React, { ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { logError } from '@/lib/utils/error-handler';
import type { AppError } from '@/lib/utils/error-handler';

interface APIBootstrapErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
    componentName: string;
  }>;
  onError?: (error: Error, componentName: string) => void;
  retryable?: boolean;
  showDetails?: boolean;
}

interface APIBootstrapErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isOffline: boolean;
}

/**
 * Error boundary specifically designed for handling API bootstrap failures
 * in homepage widgets. Provides better recovery and user feedback for
 * async/API errors, including robust offline and network-unreachable fallbacks.
 *
 * @example
 * ```tsx
 * <APIBootstrapErrorBoundary
 * componentName="FeaturedQuests"
 * retryable={true}
 * onError={(error, name) => console.log(`Error in ${name}:`, error)}
 * >
 * <FeaturedQuests />
 * </APIBootstrapErrorBoundary>
 * ```
 */
export class APIBootstrapErrorBoundary extends React.Component<
  APIBootstrapErrorBoundaryProps,
  APIBootstrapErrorState
> {
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(props: APIBootstrapErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
  }

  componentDidMount() {
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener(
      'network-unreachable',
      this.handleNetworkError as EventListener
    );
  }

  componentWillUnmount() {
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener(
      'network-unreachable',
      this.handleNetworkError as EventListener
    );
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleOnline = () => {
    this.setState({ isOffline: false });
    if (this.state.hasError) {
      this.resetError();
    }
  };

  handleNetworkError = (event: CustomEvent) => {
    this.setState({
      hasError: true,
      isOffline: true,
      error: event.detail?.originalError || new Error('Network Unreachable'),
    });
  };

  static getDerivedStateFromError(
    error: Error | AppError | Record<string, unknown>
  ): Partial<APIBootstrapErrorState> {
    const errorWithCode = error as Record<string, unknown>;
    const isNetworkError =
      (error instanceof Error || (error && typeof error.message === 'string')) &&
      (error.message.toLowerCase().includes('offline') ||
        error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('unreachable') ||
        errorWithCode.code === 'ERR_NETWORK' ||
        errorWithCode.code === 'NETWORK_ERROR' ||
        errorWithCode.code === 'TIMEOUT_ERROR');

    return {
      hasError: true,
      error: error as Error | AppError,
      errorInfo: null,
      isOffline:
        !!isNetworkError ||
        (typeof navigator !== 'undefined' && !navigator.onLine),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (!this.state.isOffline) {
      const errorContext = {
        component: this.props.componentName,
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString(),
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };

      logError(error, `API Bootstrap Error - ${this.props.componentName}`);

      Sentry.captureException(error, {
        contexts: {
          bootstrap: errorContext,
        },
        tags: {
          component: this.props.componentName,
          errorBoundary: 'APIBootstrap',
        },
      });
    }

    this.props.onError?.(error, this.props.componentName);

    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    }));
  };

  render() {
    if (this.state.hasError || this.state.isOffline) {
      const {
        fallback: FallbackComponent,
        componentName,
        showDetails = false,
      } = this.props;
      const { error, isOffline } = this.state;

      if (isOffline) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[250px] p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
            <div className="p-4 mb-4 bg-slate-200 dark:bg-slate-800 rounded-full">
              <svg
                className="w-8 h-8 text-slate-500 dark:text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.168a2 2 0 11-2.829-2.83m0 0l-7.071-7.071"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
              You are offline
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-sm">
              We couldn&apos;t connect to the server. You can still view cached
              content, but {componentName} needs an active connection.
            </p>
            <button
              onClick={() => {
                if (navigator.onLine) this.resetError();
                else window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 transition-colors hover:bg-slate-800 dark:hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          </div>
        );
      }

      if (FallbackComponent && error) {
        return (
          <FallbackComponent
            error={error}
            resetError={this.resetError}
            componentName={componentName}
          />
        );
      }

      return (
        <div
          className="w-full rounded-lg border border-red-900/30 bg-red-900/10 p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-4">
            {/* Error Icon */}
            <div className="flex-shrink-0 text-2xl" aria-hidden="true">
              ⚠️
            </div>

            {/* Error Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-red-200">
                Failed to Load {componentName}
              </h3>
              <p className="mt-1 text-sm text-red-300">
                We encountered an issue while loading this section. Please try
                again or check back later.
              </p>

              {/* Error Details (Development only) */}
              {showDetails &&
                process.env.NODE_ENV === 'development' &&
                error && (
                  <details className="mt-4 text-xs text-red-400">
                    <summary className="cursor-pointer font-medium hover:text-red-300">
                      Error Details
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-red-950/50 p-3">
                      {error.message}
                      {error.stack && `\n\n${error.stack}`}
                    </pre>
                  </details>
                )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={this.resetError}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-red-900/20"
                  aria-label={`Try loading ${componentName} again`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try Again
                </button>

                <button
                  onClick={() => (window.location.href = '/')}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-red-900/20"
                  aria-label="Go to homepage"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-3m0 0l7-4 7 4M5 10v10a1 1 0 001 1h3m10-11l2 3m-2-3V9m-6 11h3m6 0h3"
                    />
                  </svg>
                  Go Home
                </button>
              </div>

              {/* Retry hint */}
              {this.state.retryCount > 0 && (
                <p className="mt-3 text-xs text-red-400">
                  Retry attempts: {this.state.retryCount}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier use in most cases
 */
export function WithAPIBootstrapErrorBoundary({
  children,
  componentName,
  onError,
  fallback,
  showDetails = false,
}: {
  children: ReactNode;
  componentName: string;
  onError?: (error: Error, componentName: string) => void;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
    componentName: string;
  }>;
  showDetails?: boolean;
}) {
  return (
    <APIBootstrapErrorBoundary
      componentName={componentName}
      onError={onError}
      fallback={fallback}
      showDetails={showDetails}
    >
      {children}
    </APIBootstrapErrorBoundary>
  );
}
