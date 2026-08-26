type SentryModule = typeof import('@sentry/node');

let sentry: SentryModule | null = null;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return;
  }

  // Lazy-load the heavy @sentry/node module graph only when Sentry is actually
  // configured. When SENTRY_DSN is unset (dev, test and many deployments) this
  // avoids requiring the SDK at boot, cutting cold-start time and memory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/node') as SentryModule;
  sentry = Sentry;

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),
    integrations: [Sentry.httpIntegration()],
    beforeSend(event) {
      // Strip PII from user context
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

/**
 * Returns the initialized Sentry client, or null when Sentry is disabled
 * (SENTRY_DSN unset) and therefore was never loaded.
 */
export function getSentry(): SentryModule | null {
  return sentry;
}
