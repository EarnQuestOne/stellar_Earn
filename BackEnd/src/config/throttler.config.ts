import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ThrottlerAsyncOptions,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const secondsToMs = (seconds: number): number => Math.max(0, seconds) * 1000;

export const throttlerConfig: ThrottlerAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService): ThrottlerModuleOptions => {
    const defaultLimit = parseNumber(
      config.get<string>('RATE_LIMIT_LIMIT') ??
        config.get<string>('RATE_LIMIT_MAX'),
      100,
    );
    const defaultTtlSeconds = parseNumber(
      config.get<string>('RATE_LIMIT_TTL'),
      60,
    );

    const authLimit = parseNumber(
      config.get<string>('RATE_LIMIT_AUTH_LIMIT'),
      10,
    );
    const authTtlSeconds = parseNumber(
      config.get<string>('RATE_LIMIT_AUTH_TTL'),
      defaultTtlSeconds,
    );

    return {
      throttlers: [
        {
          name: 'default',
          limit: defaultLimit,
          ttl: secondsToMs(defaultTtlSeconds),
        },
        {
          name: 'auth',
          limit: authLimit,
          ttl: secondsToMs(authTtlSeconds),
        },
      ],
    };
  },
};
