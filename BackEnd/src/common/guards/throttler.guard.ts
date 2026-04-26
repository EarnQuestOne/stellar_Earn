import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';

import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { PerUserRateLimitConfigService } from '../../config/per-user-rate-limit.config';

interface ThrottlerOption {
  name?: string;
  limit: number;
  ttl: number;
}

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly perUserRateLimitConfig: PerUserRateLimitConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const { req } = this.getRequestResponse(context);
    const userRole = await this.extractUserRole(req);

    // Skip rate limiting for admins
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    return false;
  }

  /**
   * Extract user identity and role information for per-user rate limiting
   */
  private async extractUserRole(
    req: Record<string, any>,
  ): Promise<string | undefined> {
    // Check if user is in request (from auth guard)
    if (req?.user?.role) {
      return req.user.role;
    }

    // Try to extract role from JWT token
    const authHeader = req?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token) as { role?: string };
        return payload?.role;
      } catch {
        // ignore invalid tokens
      }
    }

    return undefined;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req?.user?.id ?? req?.user?.stellarAddress ?? req?.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    const authHeader = req?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify(token) as {
          sub?: string;
          stellarAddress?: string;
        };
        const jwtUserId = payload?.sub ?? payload?.stellarAddress;
        if (jwtUserId) {
          return `user:${jwtUserId}`;
        }
      } catch {
        // ignore invalid tokens and fall back to IP
      }
    }

    const forwarded = req.headers?.['x-forwarded-for'];
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return `ip:${forwarded[0]}`;
    }

    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return `ip:${forwarded.split(',')[0].trim()}`;
    }

    if (Array.isArray(req?.ips) && req.ips.length > 0) {
      return `ip:${req.ips[0]}`;
    }

    if (typeof req?.ip === 'string' && req.ip.length > 0) {
      return `ip:${req.ip}`;
    }

    return 'ip:unknown';
  }

  /**
   * Override getThrottleMetadata to apply per-user rate limits based on role
   */
  protected getThrottleMetadata(
    context: ExecutionContext,
  ): { name: string; limit: number; ttl: number }[] {
    const { req } = this.getRequestResponse(context);

    // Get base throttle metadata from decorator or use default options
    const baseMetadata =
      this.reflector.getAllAndOverride<
        { name: string; limit: number; ttl: number }[]
      >('throttler', [context.getHandler(), context.getClass()]) ||
      this.getDefaultMetadata();

    // Extract user role for per-user limiting
    let userRole = req?.user?.role;

    if (!userRole) {
      const authHeader = req?.headers?.authorization;
      if (
        typeof authHeader === 'string' &&
        authHeader.startsWith('Bearer ')
      ) {
        const token = authHeader.slice(7);
        try {
          const payload = this.jwtService.verify(token) as { role?: string };
          userRole = payload?.role;
        } catch {
          // ignore invalid tokens
        }
      }
    }

    // Determine the limit key based on role
    let limitKey: string = UserRole.USER; // default for authenticated users
    const hasUser = req?.user?.id || req?.headers?.authorization;
    if (!hasUser) {
      limitKey = 'anonymous'; // for anonymous users
    } else if (userRole) {
      limitKey = userRole;
    }

    // Get per-user limit configuration
    const perUserLimitConfig = this.perUserRateLimitConfig.getLimit(limitKey);

    // Apply per-user limits to metadata
    const updatedMetadata = baseMetadata.map((metadata) => ({
      ...metadata,
      limit: perUserLimitConfig.limit,
      ttl: perUserLimitConfig.ttl || metadata.ttl,
    }));

    return updatedMetadata;
  }

  /**
   * Get default metadata from the throttler options
   */
  private getDefaultMetadata(): {
    name: string;
    limit: number;
    ttl: number;
  }[] {
    const options = this.options as unknown as {
      throttlers?: ThrottlerOption[];
    };

    if (options?.throttlers && Array.isArray(options.throttlers)) {
      return options.throttlers.map((throttler) => ({
        name: throttler.name || 'default',
        limit: throttler.limit,
        ttl: throttler.ttl,
      }));
    }

    // Fallback if options structure is different
    return [{ name: 'default', limit: 100, ttl: 60000 }];
  }
}
