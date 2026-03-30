import { SetMetadata, applyDecorators } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_PREFIX_METADATA = 'cache:prefix';
export const CACHE_TAGS_METADATA = 'cache:tags';
export const CACHEABLE_METADATA = 'cache:cacheable';
export const CACHE_EVICT_METADATA = 'cache:evict';

export interface CacheableOptions {
  /** Static key. Omit to auto-generate from method name + serialised args. */
  key?: string;
  /** TTL in seconds. Defaults to global cache TTL. */
  ttl?: number;
  /** Key namespace prefix, e.g. 'users'. */
  prefix?: string;
  tags?: string[];
}

export interface CacheEvictOptions {
  /** Evict a single key. */
  key?: string;
  /** Evict all keys under this prefix. */
  prefix?: string;
  tags?: string[];
}

/**
 * Mark a method result as cacheable.
 * The decorated method must be inside a class that has CacheService injected as `this.cacheService`.
 *
 * @example
 * @Cacheable({ prefix: 'users', ttl: 60 })
 * async findAll(): Promise<User[]> { ... }
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheService = (this as any).cacheService;
      if (!cacheService) {
        // No cache service available; call through
        return originalMethod.apply(this, args);
      }

      const key =
        options.key ?? `${String(propertyKey)}:${JSON.stringify(args)}`;

      return cacheService.wrap(key, () => originalMethod.apply(this, args), options.ttl, options.prefix, options.tags);
    };

    return descriptor;
  };
}

/**
 * Evict one key or all keys under a prefix after the method executes successfully.
 *
 * @example
 * @CacheEvict({ prefix: 'users' })
 * async update(id: number, dto: UpdateUserDto): Promise<User> { ... }
 */
export function CacheEvict(options: CacheEvictOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      const cacheService = (this as any).cacheService;
      if (!cacheService) return result;

      if (options.prefix) {
        await cacheService.invalidatePrefix(options.prefix);
      } else if (options.key) {
        await cacheService.delete(options.key);
      } else if (options.tags) {
        await Promise.all(options.tags.map(tag => cacheService.invalidateByTag(tag)));
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Convenience metadata decorators used by CacheInterceptor for controller-level caching.
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
export const CachePrefix = (prefix: string) => SetMetadata(CACHE_PREFIX_METADATA, prefix);
export const CacheTags = (tags: string[]) => SetMetadata(CACHE_TAGS_METADATA, tags);

/**
 * Combined decorator for controller routes.
 * @example
 * @UseInterceptors(CacheInterceptor)
 * @RouteCache({ key: 'products-list', ttl: 120, prefix: 'products' })
 */
// export function RouteCache(options: CacheableOptions = {}) {
//   const decorators = [];
//   if (options.key) decorators.push(CacheKey(options.key));
//   if (options.ttl) decorators.push(CacheTTL(options.ttl));
//   if (options.prefix) decorators.push(CachePrefix(options.prefix));
//   return applyDecorators(...decorators);
