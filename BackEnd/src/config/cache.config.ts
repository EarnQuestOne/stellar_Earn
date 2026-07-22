import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const getCacheConfig = (
  configService: ConfigService,
): CacheModuleOptions => {
  const cacheType = configService.get<string>('CACHE_TYPE', 'memory');

  const defaultConfig: CacheModuleOptions = {
    isGlobal: true,
    ttl: configService.get<number>('CACHE_TTL', 300) * 1000, // Default 5 minutes
  };

  if (cacheType === 'redis') {
    return {
      ...defaultConfig,
      store: redisStore,
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_DB', 0),
      ttl: configService.get<number>('CACHE_TTL', 300),
    };
  }

  // Default to in-memory cache for development
  return defaultConfig;
};

export const CACHE_KEYS = {
  QUESTS: 'quests',
  QUEST_DETAIL: 'quest_detail',
  SUBMISSIONS: 'submissions',
  SUBMISSION_DETAIL: 'submission_detail',
  PAYOUTS: 'payouts',
  PAYOUT_DETAIL: 'payout_detail',
  USERS: 'users',
  USER_DETAIL: 'user_detail',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

export const CACHE_TTL = {
  DEFAULT: 300, // 5 minutes
  SHORT: 60, // 1 minute
  MEDIUM: 600, // 10 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;
