import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLoggerService } from '../logger/logger.service';
import { randomUUID } from 'crypto';

/**
 * CorrelationIdInterceptor
 * 
 * Generates or accepts a correlation ID at the HTTP edge and stores it in the
 * logger's request context (AsyncLocalStorage) so that every log line carries it.
 * 
 * The correlation ID is propagated through:
 * - Domain events (via EventsService)
 * - BullMQ job payloads (via JobsService)
 * - Outbound webhooks (via WebhookProcessor)
 * 
 * Header name: X-Correlation-ID
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new AppLoggerService();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract correlation ID from header or generate a new one
    const correlationId =
      request.headers['x-correlation-id'] || randomUUID();

    // Store correlation ID in logger's request context
    AppLoggerService.runWithContext(
      { correlationId },
      () => {
        // Also set request-specific context
        AppLoggerService.setRequestContext({
          correlationId,
          userId: request.user?.id,
          requestId: request.id,
          path: request.path,
          method: request.method,
        });
      },
    );

    // Add correlation ID to response header for client-side tracing
    response.setHeader('X-Correlation-ID', correlationId);

    return next.handle().pipe(
      tap({
        error: (error) => {
          this.logger.error(
            `Request failed with correlation ID: ${correlationId}`,
            error.stack,
            CorrelationIdInterceptor.name,
          );
        },
      }),
    );
  }
}
