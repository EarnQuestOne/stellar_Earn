import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized config service that wraps NestJS ConfigService.
 * Use this instead of reading process.env directly.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.config.get<number>('PORT', 3001);
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get jwtAccessExpiration(): string {
    return this.config.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m');
  }

  get logLevel(): string {
    return this.config.get<string>('LOG_LEVEL', 'info');
  }
}
