import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';
import { CacheService } from '../../modules/cache/cache.service';

/**
 * Declarative cache-aside options for a read endpoint (#2159).
 */
export interface CacheableOptions {
  /** Namespaced key prefix; the request URL is appended for uniqueness. */
  key: string;
  /** Time-to-live in seconds. */
  ttl: number;
  /** Tags the cached entry is registered under for tag-based invalidation. */
  tags?: string[];
}

export const CACHEABLE_METADATA = 'cacheable:options';

/**
 * Marks a controller handler as cacheable. Combine with
 * {@link CacheableInterceptor} to serve the handler result from the unified
 * cache-aside layer:
 *
 * ```ts
 * @Cacheable({ key: 'quests:list', ttl: 30, tags: [CacheTags.questList()] })
 * @Get()
 * findAll() { ... }
 * ```
 */
export const Cacheable = (options: CacheableOptions) =>
  SetMetadata(CACHEABLE_METADATA, options);

/**
 * Interceptor that backs {@link Cacheable} handlers with
 * `CacheService.getOrSet`. Handlers without the metadata are passed through
 * untouched, so the interceptor is safe to register globally or per-controller.
 */
@Injectable()
export class CacheableInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<CacheableOptions | undefined>(
      CACHEABLE_METADATA,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ url?: string }>();
    const key = `${options.key}:${request?.url ?? 'default'}`;

    return from(
      this.cacheService.getOrSet(key, options.ttl, options.tags ?? [], () =>
        lastValueFrom(next.handle()),
      ),
    );
  }
}
