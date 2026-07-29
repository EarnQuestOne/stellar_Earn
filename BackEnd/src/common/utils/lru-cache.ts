/**
 * Bounded in-memory LRU cache with optional TTL.
 * Issue #2032: Add bounded in-memory LRU cache for hot immutable lookups.
 *
 * Uses a Map (insertion-order preserved) for O(1) get/set operations.
 * Evicts the least-recently-used entry when capacity is reached.
 */
export class LruCache<K, V> {
  private readonly map = new Map<K, { value: V; expiresAt?: number }>();
  private readonly maxSize: number;
  private readonly ttlMs?: number;

  constructor(maxSize: number, ttlMs?: number) {
    if (maxSize <= 0) {
      throw new Error('LRU cache maxSize must be positive');
    }
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value by key. Returns undefined if missing or expired.
   * Moves the entry to the end (most-recently-used) on access.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    // Move to end (most recent)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /**
   * Set a value. Evicts the LRU entry if at capacity.
   */
  set(key: K, value: V): void {
    // Delete first to reset insertion order
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    // Evict LRU if at capacity
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }

    const expiresAt = this.ttlMs ? Date.now() + this.ttlMs : undefined;
    this.map.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key.
   */
  delete(key: K): void {
    this.map.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Number of live (non-expired) entries.
   */
  get size(): number {
    return this.map.size;
  }
}
