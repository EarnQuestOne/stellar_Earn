import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { createHash } from 'crypto';
import { Request, Response } from 'express';

/**
 * ETag / conditional-request interceptor.
 *
 * Computes an MD5 hash of the response body, sets the `ETag` header, and
 * honours `If-None-Match` by returning 304 Not Modified for unchanged
 * resources.  Only applied to GET requests with JSON responses.
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // Only apply to GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap((body) => {
        if (res.headersSent) return;

        const bodyStr =
          typeof body === 'string' ? body : JSON.stringify(body ?? '');
        const etag = `"${createHash('md5').update(bodyStr).digest('hex')}"`;

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          res.status(304).end();
        }
      }),
    );
  }
}
