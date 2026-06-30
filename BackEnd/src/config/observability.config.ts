/**
 * Default-safe observability configuration.
 * All optional settings fall back to safe defaults if not set.
 */
export const observabilityConfig = {
  logLevel: process.env.LOG_LEVEL ?? 'info',
  metricsEnabled: process.env.METRICS_ENABLED === 'true',
  tracingEnabled: process.env.TRACING_ENABLED === 'true',
  sentryDsn: process.env.SENTRY_DSN ?? '',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT ?? '9090', 10),
  healthCheckPath: process.env.HEALTH_CHECK_PATH ?? '/health',
} as const;
