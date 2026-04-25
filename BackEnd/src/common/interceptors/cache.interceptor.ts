import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { CacheService } from '../../modules/cache/cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_PREFIX_METADATA,
  CACHE_TAGS_METADATA,
} from '../decorators/cache.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const customKey = this.reflector.getAllAndOverride<string>(
      CACHE_KEY_METADATA,
      [context.getHandler(), context.getClass()],
    );

    const ttl = this.reflector.getAllAndOverride<number>(CACHE_TTL_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    const prefix = this.reflector.getAllAndOverride<string>(
      CACHE_PREFIX_METADATA,
      [context.getHandler(), context.getClass()],
    );

    const tags = this.reflector.getAllAndOverride<string[]>(
      CACHE_TAGS_METADATA,
      [context.getHandler(), context.getClass()],
    );

    // Build the final cache key: prefix:customKey or prefix:route:url or route:url
    const baseKey = customKey ?? `route:${request.url}`;
    const cacheKey = prefix ? `${prefix}:${baseKey}` : baseKey;

    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      this.logger.debug(`Route cache HIT: ${cacheKey}`);
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, ttl, tags);
        this.logger.debug(`Route cache SET: ${cacheKey}`);
      }),
    );
  }
}