import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { BODY_SIZE_LIMIT_KEY, BodySizeLimitOptions } from '../decorators/body-size-limit.decorator';

/**
 * Interceptor that enforces body size limits per controller.
 * Checks Content-Length header before body parsing occurs.
 */
@Injectable()
export class BodySizeLimitInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const controllerClass = context.getClass();

    const limits = this.reflector.get<BodySizeLimitOptions>(
      BODY_SIZE_LIMIT_KEY,
      controllerClass,
    );

    if (limits?.json) {
      const maxBytes = this.parseLimit(limits.json);
      const contentLength = request.headers['content-length'];

      if (contentLength && parseInt(contentLength, 10) > maxBytes) {
        throw new PayloadTooLargeException(
          `Content-Length ${contentLength} exceeds controller limit of ${limits.json}`,
        );
      }
    }

    return next.handle();
  }

  private parseLimit(limit: string): number {
    const match = limit.trim().match(/^(\d+)(b|kb|mb|gb)?$/i);
    if (!match) return 1024 * 1024; // default 1mb

    const amount = parseInt(match[1], 10);
    const unit = (match[2] || 'b').toLowerCase();

    switch (unit) {
      case 'gb': return amount * 1024 * 1024 * 1024;
      case 'mb': return amount * 1024 * 1024;
      case 'kb': return amount * 1024;
      default: return amount;
    }
  }
}