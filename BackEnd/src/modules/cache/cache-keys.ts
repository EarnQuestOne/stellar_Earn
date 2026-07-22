/** Current namespace version — bump when key structure changes. */
export const CACHE_NS_VERSION = 'v1';

/**
 * Builds a namespaced Redis key following the convention:
 *   <namespace>:<version>:<entity>:<id>
 *
 * @example
 *   redisKey('user', '42')        // "stellar_earn:v1:user:42"
 *   redisKey('quest', 'abc', 5)   // "stellar_earn:v1:quest:abc:5"
 */
export function redisKey(
  entity: string,
  ...parts: (string | number)[]
): string {
  return ['stellar_earn', CACHE_NS_VERSION, entity, ...parts].join(':');
}

/** Pre-built key factories for common entities. */
export const CacheKeys = {
  user: (id: string | number) => redisKey('user', id),
  quest: (id: string | number) => redisKey('quest', id),
  submission: (questId: string, userId: string) =>
    redisKey('submission', questId, userId),
  leaderboard: (page: number) => redisKey('leaderboard', page),
  session: (token: string) => redisKey('session', token),
} as const;
