import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { ConfigService } from '@nestjs/config';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with:
 * - OTLP HTTP exporter for distributed tracing
 * - Console exporter for development
 * - Express and HTTP instrumentations
 */
export function initOpenTelemetry(configService: ConfigService): void {
  const tracingEnabled = configService.get<boolean>('TRACING_ENABLED', false);
  
  if (!tracingEnabled) {
    console.log('[OpenTelemetry] Tracing is disabled. Set TRACING_ENABLED=true to enable.');
    return;
  }

  const serviceName = configService.get<string>('TRACING_SERVICE_NAME', 'stellar-earn-api');
  const serviceVersion = configService.get<string>('TRACING_SERVICE_VERSION', '1.0.0');
  const otlpEndpoint = configService.get<string>('OTLP_ENDPOINT', 'http://localhost:4318/v1/traces');
  const environment = configService.get<string>('NODE_ENV', 'development');

  console.log(`[OpenTelemetry] Initializing tracing for ${serviceName}...`);

  // Create resource with service metadata
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Configure exporters
  const otlpExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  const consoleExporter = new ConsoleSpanExporter();

  // Create tracer provider with span processors
  const tracerProvider = new NodeTracerProvider({
    resource,
  });

  // Add OTLP exporter for production
  tracerProvider.addSpanProcessor(
    environment === 'production' 
      ? new (require('@opentelemetry/sdk-trace-node').BatchSpanProcessor)(otlpExporter)
      : new SimpleSpanProcessor(consoleExporter)
  );

  // Initialize SDK with instrumentations
  sdk = new NodeSDK({
    resource,
    tracerProvider,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  // Start the SDK
  sdk.start();

  console.log(`[OpenTelemetry] Tracing initialized successfully`);
  console.log(`[OpenTelemetry] Service: ${serviceName}, Environment: ${environment}`);
  console.log(`[OpenTelemetry] OTLP Endpoint: ${otlpEndpoint}`);
}

/**
 * Gracefully shutdown OpenTelemetry SDK
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    console.log('[OpenTelemetry] Shutting down...');
    try {
      await sdk.shutdown();
      console.log('[OpenTelemetry] Shutdown complete');
    } catch (error) {
      console.error('[OpenTelemetry] Error during shutdown:', error);
    }
  }
}
