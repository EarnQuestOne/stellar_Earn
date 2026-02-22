import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';
import { sanitizeBody, sanitizeUrl } from '../logger/sanitize.util';
import { QueryFailedError } from 'typeorm';

interface RequestWithCorrelationId extends Request {
  correlationId?: string;
  user?: { id?: string; email?: string; role?: string };
}

type ErrorCategory = 
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'database'
  | 'external_service'
  | 'rate_limit'
  | 'server_error'
  | 'unknown';

interface ErrorDetails {
  category: ErrorCategory;
  statusCode: number;
  message: string;
  errorName: string;
  isOperational: boolean;
  shouldAlert: boolean;
}

@Catch()
export class ErrorLoggerFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelationId>();
    const response = ctx.getResponse<Response>();

    const errorDetails = this.categorizeError(exception);
    const errorContext = this.buildErrorContext(request, exception, errorDetails);

    this.logError(exception, errorContext, errorDetails);

    const responseBody = this.buildErrorResponse(errorDetails, request.correlationId);
    
    response.status(errorDetails.statusCode).json(responseBody);
  }

  private categorizeError(exception: unknown): ErrorDetails {
    if (exception instanceof BadRequestException) {
      return {
        category: 'validation',
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        errorName: 'BadRequestException',
        isOperational: true,
        shouldAlert: false,
      };
    }

    if (exception instanceof UnauthorizedException) {
      return {
        category: 'authentication',
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication required',
        errorName: 'UnauthorizedException',
        isOperational: true,
        shouldAlert: false,
      };
    }

    if (exception instanceof ForbiddenException) {
      return {
        category: 'authorization',
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Access denied',
        errorName: 'ForbiddenException',
        isOperational: true,
        shouldAlert: false,
      };
    }

    if (exception instanceof NotFoundException) {
      return {
        category: 'not_found',
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message || 'Resource not found',
        errorName: 'NotFoundException',
        isOperational: true,
        shouldAlert: false,
      };
    }

    if (exception instanceof ConflictException) {
      return {
        category: 'conflict',
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        errorName: 'ConflictException',
        isOperational: true,
        shouldAlert: false,
      };
    }

    if (exception instanceof QueryFailedError) {
      return {
        category: 'database',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        errorName: 'QueryFailedError',
        isOperational: false,
        shouldAlert: true,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        category: status === 429 ? 'rate_limit' : 'server_error',
        statusCode: status,
        message: exception.message,
        errorName: exception.name,
        isOperational: status < 500,
        shouldAlert: status >= 500,
      };
    }

    if (exception instanceof Error) {
      if (exception.message.includes('ECONNREFUSED') ||
          exception.message.includes('ETIMEDOUT') ||
          exception.message.includes('ENOTFOUND')) {
        return {
          category: 'external_service',
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'External service unavailable',
          errorName: exception.name,
          isOperational: false,
          shouldAlert: true,
        };
      }

      return {
        category: 'server_error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        errorName: exception.name,
        isOperational: false,
        shouldAlert: true,
      };
    }

    return {
      category: 'unknown',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      errorName: 'UnknownError',
      isOperational: false,
      shouldAlert: true,
    };
  }

  private buildErrorContext(
    request: RequestWithCorrelationId,
    exception: unknown,
    errorDetails: ErrorDetails,
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {
      correlationId: request.correlationId,
      category: errorDetails.category,
      isOperational: errorDetails.isOperational,
      method: request.method,
      url: sanitizeUrl(request.originalUrl),
      statusCode: errorDetails.statusCode,
      errorName: errorDetails.errorName,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      userId: request.user?.id,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof Error) {
      context.errorMessage = exception.message;
      
      if (exception instanceof HttpException) {
        const response = exception.getResponse();
        if (typeof response === 'object') {
          context.errorDetails = sanitizeBody(response);
        }
      }

      if (exception instanceof QueryFailedError) {
        context.databaseError = {
          query: (exception as any).query?.substring(0, 200),
          parameters: '[REDACTED]',
        };
      }
    }

    if (request.body && Object.keys(request.body).length > 0) {
      context.requestBody = sanitizeBody(request.body);
    }

    if (request.query && Object.keys(request.query).length > 0) {
      context.queryParams = sanitizeBody(request.query);
    }

    return context;
  }

  private logError(
    exception: unknown,
    context: Record<string, unknown>,
    errorDetails: ErrorDetails,
  ): void {
    const stack = exception instanceof Error ? exception.stack : undefined;
    const logMessage = `[${errorDetails.category.toUpperCase()}] ${errorDetails.errorName}: ${errorDetails.message}`;

    if (errorDetails.shouldAlert || errorDetails.statusCode >= 500) {
      this.logger.error(logMessage, stack, 'ErrorLoggerFilter', {
        ...context,
        severity: 'critical',
        alertRequired: errorDetails.shouldAlert,
      });
    } else if (errorDetails.statusCode >= 400) {
      this.logger.warn(logMessage, 'ErrorLoggerFilter', context);
    } else {
      this.logger.log(logMessage, 'ErrorLoggerFilter', context);
    }
  }

  private buildErrorResponse(
    errorDetails: ErrorDetails,
    correlationId?: string,
  ): Record<string, unknown> {
    const response: Record<string, unknown> = {
      statusCode: errorDetails.statusCode,
      error: this.getErrorTitle(errorDetails.statusCode),
      message: errorDetails.isOperational 
        ? errorDetails.message 
        : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };

    if (correlationId) {
      response.correlationId = correlationId;
    }

    if (process.env.NODE_ENV === 'development' && !errorDetails.isOperational) {
      response.debug = {
        category: errorDetails.category,
        errorName: errorDetails.errorName,
      };
    }

    return response;
  }

  private getErrorTitle(statusCode: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return titles[statusCode] || 'Error';
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
