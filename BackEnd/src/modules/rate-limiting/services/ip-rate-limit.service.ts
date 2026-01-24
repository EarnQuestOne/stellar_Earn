import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class IpRateLimitService {
  private readonly store = new Map<string, Map<string, RateLimitEntry>>();

  increment(
    ip: string,
    key: string,
    limit: number,
    windowMs: number,
  ): { count: number; remaining: number; resetTime: number } {
    if (!this.store.has(ip)) {
      this.store.set(ip, new Map());
    }

    const ipStore = this.store.get(ip)!;
    const now = Date.now();

    if (!ipStore.has(key)) {
      ipStore.set(key, { count: 0, resetTime: now + windowMs });
    }

    const entry = ipStore.get(key)!;

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
    ip: string,
    key: string,
    limit: number,
    windowMs: number,
  ): boolean {
    const result = this.increment(ip, key, limit, windowMs);
    return result.count > limit;
  }

  getStats(ip: string, key: string) {
    const ipStore = this.store.get(ip);
    return ipStore?.get(key);
  }

  reset(ip: string, key?: string) {
    if (key) {
      const ipStore = this.store.get(ip);
      ipStore?.delete(key);
    } else {
      this.store.delete(ip);
    }
  }
}
