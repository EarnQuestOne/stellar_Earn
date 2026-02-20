import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Security Exception Filter
 * Handles security-related exceptions and provides appropriate responses
 * while preventing information disclosure
 */
@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get client IP for logging
    const clientIP = this.getClientIP(request);

    // Determine status code
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseObj = exception.getResponse();
      
      if (typeof responseObj === 'string') {
        message = responseObj;
      } else if (typeof responseObj === 'object' && responseObj !== null) {
        message = (responseObj as any).message || message;
        errorDetails = (responseObj as any).error || null;
      }
    } else if (exception instanceof Error) {
      // Log the actual error for debugging
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
        `IP: ${clientIP} | URL: ${request.method} ${request.url}`,
      );
      
      // Don't expose internal error details to client
      message = 'An unexpected error occurred';
    }

    // Log security-relevant exceptions
    if (status === HttpStatus.FORBIDDEN || status === HttpStatus.UNAUTHORIZED) {
      this.logger.warn(
        `Security event: ${status} ${message} | IP: ${clientIP} | URL: ${request.method} ${request.url} | User-Agent: ${request.get('User-Agent')}`,
      );
    }

    // Log 404s for non-existent routes (potential scanning)
    if (status === HttpStatus.NOT_FOUND) {
      this.logger.verbose(
        `404 Not Found: ${request.url} | IP: ${clientIP} | User-Agent: ${request.get('User-Agent')}`,
      );
    }

    // Prepare response data
    const responseData: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: this.sanitizeErrorMessage(message, status),
    };

    // Add error details for development environment (but not for security errors)
    if (
      process.env.NODE_ENV === 'development' &&
      status !== HttpStatus.FORBIDDEN &&
      status !== HttpStatus.UNAUTHORIZED
    ) {
      responseData.error = errorDetails || exception;
    }

    // Set security headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Send response
    response.status(status).json(responseData);
  }

  private sanitizeErrorMessage(message: string, status: number): string {
    // Don't sanitize 404 messages as they're not sensitive
    if (status === HttpStatus.NOT_FOUND) {
      return message;
    }

    // For security-related errors, provide generic messages
    const securityErrorMessages = {
      [HttpStatus.FORBIDDEN]: 'Access forbidden',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized access',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests',
    };

    if (securityErrorMessages[status]) {
      return securityErrorMessages[status];
    }

    // For other errors, keep the original message but sanitize if needed
    return this.basicSanitization(message);
  }

  private basicSanitization(message: string): string {
    if (typeof message !== 'string') return 'An error occurred';

    return (
      message
        // Remove potentially sensitive information
        .replace(/password[^\s]*/gi, '[REDACTED]')
        .replace(/token[^\s]*/gi, '[REDACTED]')
        .replace(/key[^\s]*/gi, '[REDACTED]')
        .replace(/secret[^\s]*/gi, '[REDACTED]')
        // Remove paths and file information
        .replace(/[a-zA-Z]:\\[^:]*/g, '[PATH_REDACTED]')
        .replace(/\/[^:]*(?:\.[a-zA-Z0-9]+)+/g, '[FILE_REDACTED]')
        // Limit message length
        .substring(0, 200)
    );
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      (request.connection?.remoteAddress as string) ||
      (request.socket?.remoteAddress as string) ||
      'Unknown'
    );
  }
}