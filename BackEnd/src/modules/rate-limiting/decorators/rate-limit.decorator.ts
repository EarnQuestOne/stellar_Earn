import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  message?: string;
  type: 'ip' | 'user' | 'combined';
}

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: RateLimitOptions) => {
  return SetMetadata(RATE_LIMIT_KEY, options);
};

// Specific decorators for common use cases
export const IpRateLimit = (limit: number, windowMs: number) =>
  RateLimit({ limit, windowMs, type: 'ip' });

export const UserRateLimit = (limit: number, windowMs: number) =>
  RateLimit({ limit, windowMs, type: 'user' });

export const CombinedRateLimit = (limit: number, windowMs: number) =>
  RateLimit({ limit, windowMs, type: 'combined' });
