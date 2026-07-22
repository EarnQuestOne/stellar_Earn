import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { cachedStringify, cachedParse } from '../utils/serialization.utils';

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Use cachedStringify on the hot response path to avoid redundant
        // JSON.stringify calls when the same DTO object flows through multiple
        // interceptors in the same request lifecycle.
        const serialized = cachedStringify(data);
        return {
          data: cachedParse(serialized),
          meta: {
            timestamp: Date.now(),
          },
        };
      }),
    );
  }
}
