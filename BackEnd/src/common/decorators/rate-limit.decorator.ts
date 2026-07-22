import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export interface RateLimitOptions {
  name?: string;
  limit?: number;
  ttlSeconds?: number;
  blockDurationSeconds?: number;
}

export const RateLimit = (
  options: RateLimitOptions = {},
): MethodDecorator & ClassDecorator => {
  const { name = 'default', limit, ttlSeconds, blockDurationSeconds } = options;

  const throttlerOptions: Record<string, Record<string, number>> = {
    [name]: {},
  };

  if (typeof limit === 'number') {
    throttlerOptions[name].limit = limit;
  }

  if (typeof ttlSeconds === 'number') {
    throttlerOptions[name].ttl = ttlSeconds * 1000;
  }

  if (typeof blockDurationSeconds === 'number') {
    throttlerOptions[name].blockDuration = blockDurationSeconds * 1000;
  }

  return applyDecorators(Throttle(throttlerOptions));
};

export const SkipRateLimit = (
  name = 'default',
): MethodDecorator | ClassDecorator =>
  applyDecorators(SkipThrottle({ [name]: true }));
