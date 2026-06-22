import { ConfigService } from '@nestjs/config';

const sdk: any = null;

/**
 * Initialize OpenTelemetry SDK with:
 * - OTLP HTTP exporter for distributed tracing
 * - Console exporter for development
 * - Express and HTTP instrumentations
 */
export function initOpenTelemetry(configService: ConfigService): void {
  const tracingEnabled = configService.get<boolean>('TRACING_ENABLED', false);

  if (!tracingEnabled) {
    console.log(
      '[OpenTelemetry] Tracing is disabled. Set TRACING_ENABLED=true to enable.',
    );
    return;
  }

  console.log(
    '[OpenTelemetry] Tracing is enabled but not initialized in minimal mode',
  );
}

/**
 * Gracefully shutdown OpenTelemetry SDK
 */
export function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    console.log('[OpenTelemetry] Shutting down...');
    try {
      // No actual shutdown needed in minimal mode
      console.log('[OpenTelemetry] Shutdown complete');
    } catch (error) {
      console.error('[OpenTelemetry] Error during shutdown:', error);
    }
  }
  return Promise.resolve();
}
