/**
 * Centralised cache key + tag conventions for the unified cache-aside layer
 * (#2159).
 *
 * - **Keys** are namespaced by resource so entries never collide across
 *   features (`users:by-id:<id>`, `quests:list:<params>`, ...).
 * - **Tags** group every entry derived from a resource so a single write can
 *   drop all reads for it via `CacheService.invalidateTag(tag)` — e.g. a quest
 *   edit invalidates `quest:<id>` and the `quest:list` tag together.
 */

/** Stable, order-independent serialisation of query params for a cache key. */
export function serializeParams(params: Record<string, unknown> = {}): string {
  const keys = Object.keys(params).sort();
  if (keys.length === 0) {
    return 'all';
  }
  return keys.map((key) => `${key}=${String(params[key])}`).join('&');
}

/** Tag builders — pass the result to `CacheService.invalidateTag` on writes. */
export const CacheTags = {
  quest: (id: string): string => `quest:${id}`,
  questList: (): string => 'quest:list',
  user: (id: string): string => `user:${id}`,
  analyticsPlatform: (): string => 'analytics:platform',
};

/** Namespaced cache-key builders for the cached read paths. */
export const CacheKeys = {
  questList: (params: Record<string, unknown> = {}): string =>
    `quests:list:${serializeParams(params)}`,
  questById: (id: string): string => `quests:by-id:${id}`,
  userById: (id: string): string => `users:by-id:${id}`,
  platformStats: (params: Record<string, unknown> = {}): string =>
    `analytics:platform:${serializeParams(params)}`,
};

/** Default TTLs (seconds) for the cached read paths. */
export const CacheTtl = {
  quest: 60,
  questList: 30,
  user: 60,
  platformStats: 30,
};
