import { Injectable } from '@nestjs/common';

// In-memory implementation for development / single-instance deployments.
// Replace the Map with a Redis-backed store (e.g. SET key value PX ttlMs NX)
// for true distributed locking across multiple instances.

interface LockEntry {
  expiresAt: number;
}

@Injectable()
export class DistributedLockService {
  private readonly locks = new Map<string, LockEntry>();

  /**
   * Try to acquire a lock for `key` that expires after `ttlMs` milliseconds.
   * Returns true when the lock was successfully acquired, false if already held.
   */
  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      // Lock is still held by another holder.
      return false;
    }

    this.locks.set(key, { expiresAt: now + ttlMs });
    return true;
  }

  /**
   * Release the lock for `key`. Safe to call even if the lock has already expired.
   */
  releaseLock(key: string): void {
    this.locks.delete(key);
  }
}
