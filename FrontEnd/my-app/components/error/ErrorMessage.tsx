'use client';

import { useState, useEffect } from 'react';
import type { AppError } from '@/lib/utils/error-handler';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

interface ErrorMessageProps {
  error?: AppError | Error | string | null;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showDismiss?: boolean;
  variant?: 'default' | 'warning' | 'error' | 'info';
  className?: string;
}

export function ErrorMessage({
  error,
  title,
  message,
  onRetry,
  onDismiss,
  showRetry = true,
  showDismiss = false,
  variant = 'error',
  className = '',
}: ErrorMessageProps) {
  const errorHandler = useErrorHandler();
  const [isVisible, setIsVisible] = useState(true);

  // Format the error for display
  const errorInfo = error 
    ? typeof error === 'string' 
      ? { title: title || 'Error', message: error, isRecoverable: false }
      : errorHandler.formatError(error)
    : { title: title || 'Error', message: message || 'An unexpected error occurred', isRecoverable: false };

  const displayTitle = title || errorInfo.title;
  const displayMessage = message || errorInfo.message;
  const canRetry = (showRetry && errorInfo.isRecoverable && onRetry) || 
                   (error && typeof error !== 'string' && errorHandler.isRecoverable);

  // Auto-dismiss after 10 seconds for non-critical errors
  useEffect(() => {
    if (variant !== 'error' && !showDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [variant, showDismiss, onDismiss]);

  if (!isVisible || (!error && !title && !message)) {
    return null;
  }

  // Get variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          container: 'bg-yellow-900/20 border-yellow-800',
          title: 'text-yellow-200',
          message: 'text-yellow-300',
          icon: '⚠️',
        };
      case 'info':
        return {
          container: 'bg-blue-900/20 border-blue-800',
          title: 'text-blue-200',
          message: 'text-blue-300',
          icon: 'ℹ️',
        };
      case 'error':
      default:
        return {
          container: 'bg-red-900/20 border-red-800',
          title: 'text-red-200',
          message: 'text-red-300',
          icon: '❌',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`
      border rounded-xl p-4 mb-4 transition-all duration-300
      ${styles.container}
      ${className}
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
    `}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5 text-xl">
          {styles.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-lg mb-1 ${styles.title}`}>
            {displayTitle}
          </h3>
          
          <p className={`text-sm ${styles.message} mb-3`}>
            {displayMessage}
          </p>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canRetry && (
              <button
                onClick={() => {
                  onRetry?.();
                  errorHandler.clearError();
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
            
            {showDismiss && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onDismiss?.();
                  errorHandler.clearError();
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg transition-colors"
              >
                Dismiss
              </button>
            )}
            
            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && error && typeof error !== 'string' && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-zinc-900 rounded text-zinc-300 overflow-auto max-h-32">
                  {JSON.stringify(
                    {
                      message: error.message,
                      code: (error as AppError).code,
                      statusCode: (error as AppError).statusCode,
                      stack: error.stack,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
        
        {/* Close button for dismissible errors */}
        {showDismiss && (
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
              errorHandler.clearError();
            }}
            className="flex-shrink-0 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Pre-configured error message variants
export function ErrorAlert(props: Omit<ErrorMessageProps, 'variant'>) {
  return <ErrorMessage {...props} variant="error" />;
}

export function WarningAlert(props: Omit<ErrorMessageProps, 'variant'>) {
  return <ErrorMessage {...props} variant="warning" />;
}

export function InfoAlert(props: Omit<ErrorMessageProps, 'variant'>) {
  return <ErrorMessage {...props} variant="info" showDismiss={true} />;
}

// Inline error message for form fields
export function InlineError({ 
  message,
  className = ''
}: { 
  message: string;
  className?: string;
}) {
  if (!message) return null;
  
  return (
    <div className={`flex items-center gap-2 text-sm text-red-400 ${className}`}>
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}