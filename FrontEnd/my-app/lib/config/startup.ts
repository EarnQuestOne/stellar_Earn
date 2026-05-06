/**
 * Application Startup Validation
 *
 * This module performs all necessary validation checks at application startup
 * to ensure the app fails fast with clear error messages.
 */

import { validateEnvOrThrow } from './env';

/**
 * Runs all startup validation checks
 * Should be called as early as possible in the application lifecycle
 */
export function validateStartup(): void {
  try {
    // Validate environment variables
    validateEnvOrThrow();

    // Add more startup validations here as needed
    // e.g., validateBrowserSupport(), validateFeatureFlags(), etc.
  } catch (error) {
    // Log the error and re-throw to prevent app from starting
    console.error('❌ Application startup validation failed');
    console.error(error);
    throw error;
  }
}

/**
 * Validates startup in a safe way that won't crash during build
 * Only runs validation in browser environment
 */
export function validateStartupSafe(): void {
  // Skip validation during build time (SSR/SSG)
  if (typeof window === 'undefined') {
    return;
  }

  validateStartup();
}
