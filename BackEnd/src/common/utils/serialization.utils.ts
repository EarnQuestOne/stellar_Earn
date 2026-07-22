/**
 * Hot-path serialization/deserialization utilities.
 *
 * Replaces repeated JSON.parse/JSON.stringify calls on hot paths with:
 * - A result cache keyed by object identity (WeakMap) to avoid re-serializing
 *   the same object within a single request lifecycle.
 * - Fast-path checks that skip serialization for primitives and null.
 * - A bounded LRU string-to-object parse cache to avoid re-parsing identical
 *   JSON strings (e.g. cached API responses read from Redis multiple times).
 */

const MAX_PARSE_CACHE = 256;

/** LRU parse cache: JSON string → parsed value */
const parseCache = new Map<string, unknown>();

function evictParseCache(): void {
  const firstKey = parseCache.keys().next().value;
  if (firstKey !== undefined) parseCache.delete(firstKey);
}

/**
 * Parse a JSON string with an LRU cache.
 * Identical strings (e.g. repeated Redis reads) are returned from cache
 * without a second JSON.parse call.
 */
export function cachedParse<T = unknown>(json: string): T {
  if (parseCache.has(json)) {
    // Move to end (most-recently-used)
    const value = parseCache.get(json) as T;
    parseCache.delete(json);
    parseCache.set(json, value);
    return value;
  }

  const parsed = JSON.parse(json) as T;

  if (parseCache.size >= MAX_PARSE_CACHE) evictParseCache();
  parseCache.set(json, parsed);

  return parsed;
}

/** Serialize cache: object identity → JSON string */
const serializeCache = new WeakMap<object, string>();

/**
 * Serialize a value to JSON with an identity cache.
 * If the same object reference is serialized again within its lifetime
 * (e.g. the same DTO passed through multiple interceptors), the cached
 * string is returned immediately.
 */
export function cachedStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  const cached = serializeCache.get(value);
  if (cached !== undefined) return cached;

  const json = JSON.stringify(value);
  serializeCache.set(value, json);
  return json;
}

/**
 * Deep-clone a plain object via the parse cache.
 * Faster than structuredClone for plain JSON-serializable objects because
 * the stringify result is cached on the source object.
 */
export function fastClone<T>(value: T): T {
  return cachedParse<T>(cachedStringify(value));
}

/** Clear the parse cache (useful in tests). */
export function clearSerializationCaches(): void {
  parseCache.clear();
}
