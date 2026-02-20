'use client';

import React from 'react';
import { ErrorMessage } from './ErrorMessage';
import { logError, ERROR_CODES } from '@/lib/utils/error-handler';
import type { AppError } from '@/lib/utils/error-handler';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    logError(error, 'React Error Boundary');
    
    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent, showDetails = false } = this.props;
      const { error } = this.state;

      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent error={error!} resetError={this.resetError} />;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <ErrorMessage
              error={error}
              title="Something went wrong"
              message="We encountered an unexpected error. Please try again."
              onRetry={this.resetError}
              showRetry={true}
              variant="error"
              className="mb-6"
            />
            
            {showDetails && process.env.NODE_ENV === 'development' && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-zinc-200 font-medium mb-2">Error Details:</h4>
                <pre className="text-xs text-zinc-400 overflow-auto max-h-60">
                  {JSON.stringify(
                    {
                      message: error?.message,
                      stack: error?.stack,
                      componentStack: this.state.errorInfo?.componentStack,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={this.resetError}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors font-medium"
              >
                Reload Page
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function ErrorBoundaryWrapper({
  children,
  onError,
  showDetails = false,
}: {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}) {
  return (
    <ErrorBoundary onError={onError} showDetails={showDetails}>
      {children}
    </ErrorBoundary>
  );
}

// Specific error boundaries for different contexts
export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary caught:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ 
  children, 
  componentName 
}: { 
  children: React.ReactNode;
  componentName: string;
}) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Error in ${componentName}:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Error boundary that catches and displays errors in a specific area
export function LocalErrorBoundary({ 
  children,
  fallback,
  className = ''
}: {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <ErrorBoundary fallback={fallback}>
        {children}
      </ErrorBoundary>
    </div>
  );
}