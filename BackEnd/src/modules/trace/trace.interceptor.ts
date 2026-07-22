import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { currentTraceId } from './trace-context.storage';

export const TRACE_HEADER = 'X-Trace-ID';

/**
 * TraceInterceptor reads the current trace ID from AsyncLocalStorage and
 * appends it as `X-Trace-ID` on every HTTP response.  This allows clients
 * and API gateways to correlate requests with their execution traces without
 * coupling to the response body shape.
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const traceId = currentTraceId();
        if (!traceId) return;

        const res = context.switchToHttp().getResponse<{
          setHeader: (k: string, v: string) => void;
        }>();
        res.setHeader(TRACE_HEADER, traceId);
      }),
    );
  }
}
