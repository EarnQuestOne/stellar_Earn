import { ConfigService } from '@nestjs/config';
import { UserRole } from '../modules/auth/enums/user-role.enum';

export interface PerUserRateLimitConfig {
  [key: string]: {
    limit: number;
    ttl: number; // in milliseconds
  };
}

/**
 * Per-user rate limit configuration based on user roles
 * Allows different rate limiting tiers for different user types
 */
export class PerUserRateLimitConfigService {
  private readonly config: PerUserRateLimitConfig;

  constructor(configService: ConfigService) {
    const parseNumber = (
      value: string | undefined,
      fallback: number,
    ): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const secondsToMs = (seconds: number): number =>
      Math.max(0, seconds) * 1000;

    // Default per-user limits
    const defaultUserLimit = parseNumber(
      configService.get<string>('RATE_LIMIT_USER_LIMIT'),
      100,
    );
    const defaultUserTTLSeconds = parseNumber(
      configService.get<string>('RATE_LIMIT_USER_TTL'),
      60,
    );

    // Verifier-specific limits (higher than regular users)
    const verifierLimit = parseNumber(
      configService.get<string>('RATE_LIMIT_VERIFIER_LIMIT'),
      200,
    );
    const verifierTTLSeconds = parseNumber(
      configService.get<string>('RATE_LIMIT_VERIFIER_TTL'),
      defaultUserTTLSeconds,
    );

    // Auth endpoint specific limits per user (when authenticated)
    const authUserLimit = parseNumber(
      configService.get<string>('RATE_LIMIT_AUTH_USER_LIMIT'),
      30,
    );
    const authUserTTLSeconds = parseNumber(
      configService.get<string>('RATE_LIMIT_AUTH_USER_TTL'),
      defaultUserTTLSeconds,
    );

    this.config = {
      // Anonymous users (IP-based tracking)
      anonymous: {
        limit: parseNumber(
          configService.get<string>('RATE_LIMIT_ANONYMOUS_LIMIT'),
          50,
        ),
        ttl: secondsToMs(
          parseNumber(
            configService.get<string>('RATE_LIMIT_ANONYMOUS_TTL'),
            60,
          ),
        ),
      },

      // Regular authenticated users
      [UserRole.USER]: {
        limit: defaultUserLimit,
        ttl: secondsToMs(defaultUserTTLSeconds),
      },

      // Verifiers (higher limits due to more operations)
      [UserRole.VERIFIER]: {
        limit: verifierLimit,
        ttl: secondsToMs(verifierTTLSeconds),
      },

      // Admins bypass rate limiting (handled in guard)
      [UserRole.ADMIN]: {
        limit: Infinity,
        ttl: 0,
      },

      // Auth endpoints for authenticated users
      auth_authenticated: {
        limit: authUserLimit,
        ttl: secondsToMs(authUserTTLSeconds),
      },
    };
  }

  /**
   * Get rate limit config for a specific user role or tracker type
   */
  getLimit(roleOrKey: string): { limit: number; ttl: number } {
    const config =
      this.config[roleOrKey] ||
      this.config[UserRole.USER] ||
      this.config.anonymous;

    return {
      limit: config.limit,
      ttl: config.ttl,
    };
  }

  /**
   * Get all configured limits
   */
  getAllLimits(): PerUserRateLimitConfig {
    return this.config;
  }

  /**
   * Check if a user role has rate limiting enabled
   */
  isRateLimited(roleOrKey: string): boolean {
    const config = this.config[roleOrKey];
    return config && config.limit !== Infinity;
  }
}
