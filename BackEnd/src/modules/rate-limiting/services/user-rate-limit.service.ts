import { Injectable } from '@nestjs/common';

interface UserLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class UserRateLimitService {
  private readonly store = new Map<string | number, Map<string, UserLimitEntry>>();

  increment(
    userId: string | number,
    key: string,
    limit: number,
    windowMs: number,
  ): { count: number; remaining: number; resetTime: number } {
    if (!this.store.has(userId)) {
      this.store.set(userId, new Map());
    }

    const userStore = this.store.get(userId)!;
    const now = Date.now();

    if (!userStore.has(key)) {
      userStore.set(key, { count: 0, resetTime: now + windowMs });
    }

    const entry = userStore.get(key)!;

    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    entry.count++;

    const remaining = Math.max(0, limit - entry.count);
    const resetTime = entry.resetTime;

    return { count: entry.count, remaining, resetTime };
  }

  isLimited(
    userId: string | number,
    key: string,
    limit: number,
    windowMs: number,
  ): boolean {
    const result = this.increment(userId, key, limit, windowMs);
    return result.count > limit;
  }

  getStats(userId: string | number, key: string) {
    const userStore = this.store.get(userId);
    return userStore?.get(key);
  }

  reset(userId: string | number, key?: string) {
    if (key) {
      const userStore = this.store.get(userId);
      userStore?.delete(key);
    } else {
      this.store.delete(userId);
    }
  }
}
