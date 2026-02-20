'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AppError } from '../utils/error-handler';
import { 
  getFriendlyErrorMessage, 
  isRecoverableError, 
  logError,
  formatErrorForDisplay,
  withErrorHandling
} from '../utils/error-handler';

interface UseErrorHandlerReturn {
  error: AppError | null;
  errorMessage: string;
  isRecoverable: boolean;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  handleError: (error: AppError | Error, context?: string) => void;
  withErrorHandling: <T>(operation: () => Promise<T>, context?: string) => Promise<[T | null, AppError | null]>;
  formatError: (error: AppError | Error) => {
    title: string;
    message: string;
    isRecoverable: boolean;
    action?: string;
  };
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null);

  // Get friendly error message
  const errorMessage = error ? getFriendlyErrorMessage(error) : '';
  
  // Check if error is recoverable
  const isRecoverable = error ? isRecoverableError(error) : false;

  // Handle error with logging
  const handleError = useCallback((error: AppError | Error, context?: string) => {
    logError(error, context);
    setError(error as AppError);
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Format error for display
  const formatError = useCallback((error: AppError | Error) => {
    return formatErrorForDisplay(error);
  }, []);

  // Enhanced withErrorHandling that also sets state
  const enhancedWithErrorHandling = useCallback(
    async <T,>(operation: () => Promise<T>, context?: string): Promise<[T | null, AppError | null]> => {
      const [result, error] = await withErrorHandling(operation, context);
      
      if (error) {
        handleError(error, context);
      }
      
      return [result, error];
    },
    [handleError]
  );

  return {
    error,
    errorMessage,
    isRecoverable,
    setError,
    clearError,
    handleError,
    withErrorHandling: enhancedWithErrorHandling,
    formatError,
  };
}

// Hook for handling async operations with automatic error handling
export function useAsyncOperation<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const errorHandler = useErrorHandler();

  const execute = useCallback(
    async (operation: () => Promise<T>, context?: string) => {
      setIsLoading(true);
      errorHandler.clearError();
      
      try {
        const [result, error] = await errorHandler.withErrorHandling(operation, context);
        
        if (error) {
          setData(null);
          return [null, error] as const;
        }
        
        setData(result);
        return [result, null] as const;
      } finally {
        setIsLoading(false);
      }
    },
    [errorHandler]
  );

  const reset = useCallback(() => {
    setData(null);
    setIsLoading(false);
    errorHandler.clearError();
  }, [errorHandler]);

  return {
    data,
    isLoading,
    error: errorHandler.error,
    errorMessage: errorHandler.errorMessage,
    isRecoverable: errorHandler.isRecoverable,
    execute,
    reset,
    clearError: errorHandler.clearError,
  };
}

// Hook for handling form submissions with error handling
export function useErrorForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorHandler = useErrorHandler();

  const handleSubmit = useCallback(
    async <T,>(
      submitFunction: () => Promise<T>,
      onSuccess?: (data: T) => void,
      onError?: (error: AppError) => void
    ) => {
      setIsSubmitting(true);
      errorHandler.clearError();
      
      try {
        const [result, error] = await errorHandler.withErrorHandling(submitFunction, 'Form submission');
        
        if (error) {
          onError?.(error);
          return false;
        }
        
        onSuccess?.(result!);
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [errorHandler]
  );

  return {
    isSubmitting,
    error: errorHandler.error,
    errorMessage: errorHandler.errorMessage,
    isRecoverable: errorHandler.isRecoverable,
    handleSubmit,
    clearError: errorHandler.clearError,
  };
}

// Global error handler context hook
export function useGlobalErrorHandler() {
  // In a real implementation, this would use React Context
  // For now, we'll return the basic error handler
  return useErrorHandler();
}