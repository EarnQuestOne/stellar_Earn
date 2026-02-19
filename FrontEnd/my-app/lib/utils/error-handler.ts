// Error handling utilities for the StellarEarn application

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  details?: Record<string, any>;
}

export interface ErrorInfo {
  message: string;
  code?: string;
  statusCode?: number;
  timestamp: string;
  url?: string;
  stack?: string;
}

// Common error types
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Wallet errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_ERROR: 'WALLET_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

// Error categories for user-friendly messages
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  RESOURCE: 'resource',
  SERVER: 'server',
  WALLET: 'wallet',
  UNKNOWN: 'unknown',
} as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

// Create a standardized error object
export function createAppError(
  message: string,
  code: string = ERROR_CODES.SERVER_ERROR,
  statusCode: number = 500,
  details?: Record<string, any>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.details = details;
  return error;
}

// Categorize errors for user-friendly messages
export function categorizeError(error: AppError | Error): ErrorCategory {
  const appError = error as AppError;
  
  // Check error codes
  if (appError.code) {
    const errorCode = appError.code;
    if (Object.values(ERROR_CODES).includes(errorCode as any)) {
      switch (errorCode) {
        case ERROR_CODES.NETWORK_ERROR:
        case ERROR_CODES.TIMEOUT_ERROR:
        case ERROR_CODES.CONNECTION_FAILED:
          return ERROR_CATEGORIES.NETWORK;
        
        case ERROR_CODES.UNAUTHORIZED:
        case ERROR_CODES.FORBIDDEN:
        case ERROR_CODES.TOKEN_EXPIRED:
          return ERROR_CATEGORIES.AUTHENTICATION;
        
        case ERROR_CODES.VALIDATION_ERROR:
        case ERROR_CODES.INVALID_INPUT:
          return ERROR_CATEGORIES.VALIDATION;
        
        case ERROR_CODES.NOT_FOUND:
        case ERROR_CODES.ALREADY_EXISTS:
          return ERROR_CATEGORIES.RESOURCE;
        
        case ERROR_CODES.SERVER_ERROR:
        case ERROR_CODES.SERVICE_UNAVAILABLE:
          return ERROR_CATEGORIES.SERVER;
        
        case ERROR_CODES.WALLET_NOT_CONNECTED:
        case ERROR_CODES.WALLET_ERROR:
        case ERROR_CODES.TRANSACTION_FAILED:
          return ERROR_CATEGORIES.WALLET;
      }
    }
  }
  
  // Check status codes
  if (appError.statusCode) {
    if (appError.statusCode >= 400 && appError.statusCode < 500) {
      return ERROR_CATEGORIES.VALIDATION;
    }
    if (appError.statusCode >= 500) {
      return ERROR_CATEGORIES.SERVER;
    }
  }
  
  return ERROR_CATEGORIES.UNKNOWN;
}

// Get user-friendly error messages
export function getFriendlyErrorMessage(error: AppError | Error): string {
  const category = categorizeError(error);
  const appError = error as AppError;
  
  switch (category) {
    case ERROR_CATEGORIES.NETWORK:
      return 'Network connection failed. Please check your internet connection and try again.';
    
    case ERROR_CATEGORIES.AUTHENTICATION:
      return 'Authentication failed. Please log in again.';
    
    case ERROR_CATEGORIES.VALIDATION:
      if (appError.details?.field) {
        return `Invalid ${appError.details.field}. Please check your input and try again.`;
      }
      return 'Please check your input and try again.';
    
    case ERROR_CATEGORIES.RESOURCE:
      if (appError.code === ERROR_CODES.NOT_FOUND) {
        return 'The requested resource was not found.';
      }
      return 'The resource already exists.';
    
    case ERROR_CATEGORIES.SERVER:
      return 'Something went wrong on our end. Please try again later.';
    
    case ERROR_CATEGORIES.WALLET:
      if (appError.code === ERROR_CODES.WALLET_NOT_CONNECTED) {
        return 'Please connect your wallet to continue.';
      }
      return 'Wallet operation failed. Please try again.';
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// Get error details for logging
export function getErrorInfo(error: AppError | Error, url?: string): ErrorInfo {
  const appError = error as AppError;
  
  return {
    message: error.message,
    code: appError.code,
    statusCode: appError.statusCode,
    timestamp: new Date().toISOString(),
    url,
    stack: error.stack,
  };
}

// Log error to console (in production, this would send to error tracking service)
export function logError(error: AppError | Error, context?: string): void {
  const errorInfo = getErrorInfo(error);
  
  console.error('Application Error:', {
    ...errorInfo,
    context,
  });
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, Bugsnag, or DataDog
}

// Check if error is recoverable (can show retry option)
export function isRecoverableError(error: AppError | Error): boolean {
  const category = categorizeError(error);
  const appError = error as AppError;
  
  // Network errors and server errors are usually recoverable
  if (category === ERROR_CATEGORIES.NETWORK || category === ERROR_CATEGORIES.SERVER) {
    return true;
  }
  
  // Some specific errors are recoverable
  if (appError.code === ERROR_CODES.TOKEN_EXPIRED) {
    return true;
  }
  
  return false;
}

// Format error for display
export function formatErrorForDisplay(error: AppError | Error): {
  title: string;
  message: string;
  isRecoverable: boolean;
  action?: string;
} {
  const category = categorizeError(error);
  const isRecoverable = isRecoverableError(error);
  
  let title = 'Error';
  let action = 'Try Again';
  
  switch (category) {
    case ERROR_CATEGORIES.NETWORK:
      title = 'Connection Error';
      action = 'Retry Connection';
      break;
    
    case ERROR_CATEGORIES.AUTHENTICATION:
      title = 'Authentication Error';
      action = 'Log In';
      break;
    
    case ERROR_CATEGORIES.VALIDATION:
      title = 'Invalid Input';
      action = 'Check Input';
      break;
    
    case ERROR_CATEGORIES.RESOURCE:
      title = 'Resource Error';
      action = (error as AppError).code === ERROR_CODES.NOT_FOUND ? 'Go Back' : 'Try Again';
      break;
    
    case ERROR_CATEGORIES.SERVER:
      title = 'Server Error';
      action = 'Retry';
      break;
    
    case ERROR_CATEGORIES.WALLET:
      title = 'Wallet Error';
      action = (error as AppError).code === ERROR_CODES.WALLET_NOT_CONNECTED ? 'Connect Wallet' : 'Try Again';
      break;
    
    default:
      title = 'Unexpected Error';
      action = 'Try Again';
  }
  
  return {
    title,
    message: getFriendlyErrorMessage(error),
    isRecoverable,
    action: isRecoverable ? action : undefined,
  };
}

// Helper function to wrap async operations with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<[T | null, AppError | null]> {
  try {
    const result = await operation();
    return [result, null];
  } catch (error) {
    const appError = error instanceof Error 
      ? error as AppError 
      : createAppError('Unknown error occurred', ERROR_CODES.SERVER_ERROR);
    
    logError(appError, context);
    return [null, appError];
  }
}