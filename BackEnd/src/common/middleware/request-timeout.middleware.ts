import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const REQUEST_TIMEOUT_MS =
  parseInt(process.env.REQUEST_TIMEOUT_MS || '', 10) || 30_000;

/**
 * Global request timeout middleware.
 *
 * Sets an AbortController signal on the request so downstream handlers
 * (Axios calls, DB queries, etc.) can detect client disconnection or
 * enforce a hard deadline.  If the timeout fires before the response is
 * sent, a 408 Request Timeout is returned.
 */
@Injectable()
export class RequestTimeoutMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const controller = new AbortController();
    const signal = controller.signal;

    // Attach signal so downstream code can use req.signal
    (req as any).signal = signal;

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          statusCode: 408,
          message: 'Request timeout',
        });
      }
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    // Clean up when the response finishes or closes.
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cleanup);
    };
    res.on('finish', cleanup);
    res.on('close', cleanup);
    signal.addEventListener('abort', cleanup);

    next();
  }
}
