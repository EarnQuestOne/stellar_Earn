import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only capture 5xx errors and unexpected exceptions in Sentry
    if (status >= 500 || !(exception instanceof HttpException)) {
      Sentry.addBreadcrumb({
        category: 'http',
        message: `${request.method} ${request.originalUrl}`,
        level: 'error',
        data: {
          method: request.method,
          url: request.originalUrl,
          statusCode: status,
        },
      });

      Sentry.captureException(exception, {
        extra: {
          method: request.method,
          url: request.originalUrl,
          statusCode: status,
        },
      });
    }

    // Re-throw so other filters can handle the response
    throw exception;
  }
}
