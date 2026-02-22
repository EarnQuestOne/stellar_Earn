import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger/logger.service';
import { sanitizeHeaders, sanitizeUrl, sanitizeBody } from '../logger/sanitize.util';
import { randomUUID } from 'crypto';

export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
  requestStartTime?: bigint;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: RequestWithCorrelationId, res: Response, next: NextFunction): void {
    const correlationId = 
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      randomUUID();

    req.correlationId = correlationId;
    req.requestStartTime = process.hrtime.bigint();

    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', correlationId);

    AppLoggerService.runWithContext(
      {
        correlationId,
        path: req.originalUrl,
        method: req.method,
      },
      () => {
        this.logRequest(req);

        const originalJson = res.json.bind(res);
        let responseBody: unknown;

        res.json = (body: unknown) => {
          responseBody = body;
          return originalJson(body);
        };

        res.on('finish', () => {
          this.logResponse(req, res, responseBody);
        });

        res.on('error', (error: Error) => {
          this.logger.error(
            'Response error',
            error.stack,
            'HTTP',
            {
              correlationId,
              method: req.method,
              url: sanitizeUrl(req.originalUrl),
              error: error.message,
            },
          );
        });

        next();
      },
    );
  }

  private logRequest(req: RequestWithCorrelationId): void {
    const shouldLogBody = this.shouldLogRequestBody(req);
    
    const logData: Record<string, unknown> = {
      correlationId: req.correlationId,
      method: req.method,
      url: sanitizeUrl(req.originalUrl),
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      referer: req.headers['referer'],
    };

    if (shouldLogBody && req.body && Object.keys(req.body).length > 0) {
      logData.body = sanitizeBody(req.body);
    }

    if (process.env.LOG_HEADERS === 'true') {
      logData.headers = sanitizeHeaders(req.headers as Record<string, string>);
    }

    this.logger.http('Incoming request', logData);
  }

  private logResponse(
    req: RequestWithCorrelationId,
    res: Response,
    responseBody?: unknown,
  ): void {
    const endTime = process.hrtime.bigint();
    const startTime = req.requestStartTime || endTime;
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const logData: Record<string, unknown> = {
      correlationId: req.correlationId,
      method: req.method,
      url: sanitizeUrl(req.originalUrl),
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      durationMs: Math.round(durationMs * 100) / 100,
      contentLength: res.get('content-length'),
    };

    if (this.shouldLogResponseBody(res) && responseBody) {
      logData.responseBody = sanitizeBody(responseBody);
    }

    const logLevel = this.getLogLevelForStatus(res.statusCode);
    
    if (logLevel === 'error') {
      this.logger.error('Request completed with error', undefined, 'HTTP', logData);
    } else if (logLevel === 'warn') {
      this.logger.warn('Request completed with warning', 'HTTP', logData);
    } else {
      this.logger.http('Request completed', logData);
    }

    this.logger.performance({
      operation: `${req.method} ${this.getRoutePath(req)}`,
      durationMs: Math.round(durationMs * 100) / 100,
      success: res.statusCode < 400,
      metadata: {
        statusCode: res.statusCode,
        correlationId: req.correlationId,
      },
    });
  }

  private shouldLogRequestBody(req: Request): boolean {
    const contentType = req.headers['content-type'] || '';
    const loggableContentTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'text/plain',
    ];
    
    return loggableContentTypes.some((type) => contentType.includes(type));
  }

  private shouldLogResponseBody(res: Response): boolean {
    if (process.env.LOG_RESPONSE_BODY !== 'true') {
      return false;
    }
    
    const contentType = res.get('content-type') || '';
    return contentType.includes('application/json');
  }

  private getLogLevelForStatus(statusCode: number): 'error' | 'warn' | 'info' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private getRoutePath(req: Request): string {
    const route = (req as any).route;
    if (route?.path) {
      return route.path;
    }
    return req.originalUrl.split('?')[0];
  }
}
