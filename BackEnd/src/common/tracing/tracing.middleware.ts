import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TracingService } from './tracing.service';

export interface RequestWithTrace extends Request {
  traceId?: string;
  spanId?: string;
}

/**
 * Express middleware that:
 *  1. Reads an incoming W3C `traceparent` header (or generates a fresh trace).
 *  2. Injects trace/span IDs into the request object.
 *  3. Returns `traceparent` and `X-Trace-ID` response headers.
 *  4. Wraps the remaining request pipeline in the AsyncLocalStorage TraceContext.
 */
@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(private readonly tracing: TracingService) {}

  use(req: RequestWithTrace, res: Response, next: NextFunction): void {
    const traceparent = req.headers['traceparent'] as string | undefined;
    const ctx = this.tracing.extractContext(traceparent);

    req.traceId = ctx.traceId;
    req.spanId = ctx.spanId;

    res.setHeader('traceparent', this.tracing.injectContext(ctx));
    res.setHeader('X-Trace-ID', ctx.traceId);

    this.tracing.runInContext(ctx, () => next());
  }
}
