/**
 * Error Boundary and Error Handling Components
 *
 * This module provides comprehensive error handling components for the frontend:
 * - General purpose error boundaries (ErrorBoundary, LocalErrorBoundary)
 * - API bootstrap error handling (APIBootstrapErrorBoundary)
 * - Error display components (ErrorMessage, BootstrapErrorFallback)
 */

export {
  ErrorBoundary,
  ErrorBoundaryWrapper,
  AppErrorBoundary,
  ComponentErrorBoundary,
  LocalErrorBoundary,
} from './ErrorBoundary';
export {
  APIBootstrapErrorBoundary,
  WithAPIBootstrapErrorBoundary,
} from './APIBootstrapErrorBoundary';
export { ErrorMessage } from './ErrorMessage';
export { BootstrapErrorFallback } from './BootstrapErrorFallback';
export { OfflineFallback } from './OfflineFallback';
export { ApiUnreachableFallback } from './ApiUnreachableFallback';
