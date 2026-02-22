import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  SetMetadata,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLoggerService } from '../logger/logger.service';
import { sanitizeBody, sanitizeUrl } from '../logger/sanitize.util';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';

interface RequestWithCorrelationId extends Request {
  correlationId?: string;
  user?: { id?: string; email?: string; role?: string };
}

export const SKIP_LOGGING_KEY = 'skipLogging';

export const SkipLogging = () => SetMetadata(SKIP_LOGGING_KEY, true);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly reflector?: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skipLogging = this.reflector?.getAllAndOverride<boolean>(SKIP_LOGGING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipLogging) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelationId>();
    const response = ctx.getResponse<Response>();
    const startTime = process.hrtime.bigint();

    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const routeInfo = `${controllerName}.${handlerName}`;

    this.logger.debug(`Executing handler: ${routeInfo}`, 'LoggingInterceptor', {
      correlationId: request.correlationId,
      method: request.method,
      path: sanitizeUrl(request.originalUrl),
      userId: request.user?.id,
      handler: routeInfo,
    });

    return next.handle().pipe(
      tap((responseData) => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;

        this.logSuccess(request, response, durationMs, routeInfo, responseData);
      }),
      catchError((error) => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;

        this.logError(request, durationMs, routeInfo, error);

        return throwError(() => error);
      }),
    );
  }

  private logSuccess(
    request: RequestWithCorrelationId,
    response: Response,
    durationMs: number,
    routeInfo: string,
    responseData?: unknown,
  ): void {
    const logData: Record<string, unknown> = {
      correlationId: request.correlationId,
      method: request.method,
      path: sanitizeUrl(request.originalUrl),
      statusCode: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      handler: routeInfo,
      userId: request.user?.id,
    };

    if (process.env.LOG_RESPONSE_DATA === 'true' && responseData !== undefined) {
      const sanitized = sanitizeBody(responseData);
      if (typeof sanitized === 'object' && sanitized !== null) {
        const keys = Object.keys(sanitized);
        logData.responseKeys = keys.slice(0, 10);
        logData.responseSize = JSON.stringify(sanitized).length;
      }
    }

    this.logger.log(`Handler completed: ${routeInfo}`, 'LoggingInterceptor', logData);

    this.logger.performance({
      operation: routeInfo,
      durationMs: Math.round(durationMs * 100) / 100,
      success: true,
      metadata: {
        method: request.method,
        path: sanitizeUrl(request.originalUrl),
        statusCode: response.statusCode,
        correlationId: request.correlationId,
      },
    });
  }

  private logError(
    request: RequestWithCorrelationId,
    durationMs: number,
    routeInfo: string,
    error: unknown,
  ): void {
    const isHttpException = error instanceof HttpException;
    const isError = error instanceof Error;
    
    const statusCode = isHttpException ? error.getStatus() : 500;
    const errorResponse = isHttpException ? error.getResponse() : null;
    const errorName = isError ? error.name : 'UnknownError';
    const errorMessage = isError ? error.message : String(error);
    const errorStack = isError ? error.stack : undefined;

    const logData: Record<string, unknown> = {
      correlationId: request.correlationId,
      method: request.method,
      path: sanitizeUrl(request.originalUrl),
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      handler: routeInfo,
      userId: request.user?.id,
      errorName,
      errorMessage,
    };

    if (errorResponse && typeof errorResponse === 'object') {
      logData.errorResponse = sanitizeBody(errorResponse);
    }

    if (statusCode >= 500) {
      this.logger.error(
        `Handler failed: ${routeInfo}`,
        errorStack,
        'LoggingInterceptor',
        logData,
      );
    } else {
      this.logger.warn(`Handler returned error: ${routeInfo}`, 'LoggingInterceptor', logData);
    }

    this.logger.performance({
      operation: routeInfo,
      durationMs: Math.round(durationMs * 100) / 100,
      success: false,
      metadata: {
        method: request.method,
        path: sanitizeUrl(request.originalUrl),
        statusCode,
        errorName,
        correlationId: request.correlationId,
      },
    });
  }
}
