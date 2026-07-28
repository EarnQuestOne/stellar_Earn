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

type HeaderValue = string | string[] | undefined;

interface ThrottlerRequest {
  user?: {
    id?: string;
    role?: string;
    stellarAddress?: string;
    sub?: string;
  };
  headers?: Record<string, HeaderValue>;
  ips?: string[];
  ip?: string;
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

  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    const userRole = this.extractUserRole(req);

    // Skip rate limiting for admins
    if (userRole === UserRole.ADMIN) {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  /**
   * Extract user identity and role information for per-user rate limiting.
   * The JWT payload does not contain a `role` claim, so we derive the role
   * by checking the stellarAddress against the ADMIN_ADDRESSES env var.
   */
  private extractUserRole(req: ThrottlerRequest): string | undefined {
    // Check if user is already populated by a preceding auth guard
    if (req.user?.role) {
      return req.user.role;
    }

    // Try to extract stellarAddress from JWT and derive role
    const authHeader = this.getHeader(req, 'authorization');
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify<{ stellarAddress?: string; role?: string }>(token);
        if (payload.role) {
          return payload.role;
        }
        // Derive role from ADMIN_ADDRESSES
        if (payload.stellarAddress) {
          const adminAddresses = (process.env.ADMIN_ADDRESSES || '')
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);
          if (adminAddresses.includes(payload.stellarAddress)) {
            return UserRole.ADMIN;
          }
          return UserRole.USER;
        }
      } catch {
        // ignore invalid tokens
      }
    }

    return undefined;
  }

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(this.resolveTracker(req as ThrottlerRequest));
  }

  private resolveTracker(req: ThrottlerRequest): string {
    const userId = req.user?.id ?? req.user?.stellarAddress ?? req.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    const authHeader = this.getHeader(req, 'authorization');
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify<{
          sub?: string;
          stellarAddress?: string;
        }>(token);
        const jwtUserId = payload.sub ?? payload.stellarAddress;
        if (jwtUserId) {
          return `user:${jwtUserId}`;
        }
      } catch {
        // ignore invalid tokens and fall back to IP
      }
    }

    const forwarded = this.getHeader(req, 'x-forwarded-for');
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return `ip:${forwarded[0]}`;
    }

    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return `ip:${forwarded.split(',')[0].trim()}`;
    }

    if (Array.isArray(req.ips) && req.ips.length > 0) {
      return `ip:${req.ips[0]}`;
    }

    if (typeof req.ip === 'string' && req.ip.length > 0) {
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
    const req = this.getRequest(context);

    // Get base throttle metadata from decorator or use default options
    const baseMetadata =
      this.reflector.getAllAndOverride<
        { name: string; limit: number; ttl: number }[] | undefined
      >('throttler', [context.getHandler(), context.getClass()]) ??
      this.getDefaultMetadata();

    // Extract user role for per-user limiting (reuse extractUserRole)
    const userRole = this.extractUserRole(req);

    // Determine the limit key based on role
    let limitKey: string = UserRole.USER; // default for authenticated users
    const hasUser = req.user?.id ?? this.getHeader(req, 'authorization');
    if (!hasUser) {
      limitKey = 'anonymous'; // for anonymous users
    } else if (userRole) {
      limitKey = userRole;
    }

    // Get per-user limit configuration
    const perUserLimitConfig = this.perUserRateLimitConfig.getLimit(limitKey);

    // Apply endpoint-specific limits when a named @RateLimit config exists;
    // otherwise keep the existing role/user-based throttling behavior.
    const updatedMetadata = baseMetadata.map((metadata) => ({
      ...metadata,
      ...this.resolveMetadataLimit(metadata, perUserLimitConfig),
    }));

    return updatedMetadata;
  }

  private resolveMetadataLimit(
    metadata: { name: string; limit: number; ttl: number },
    perUserLimitConfig: { limit: number; ttl: number },
  ): { limit: number; ttl: number } {
    if (metadata.name && metadata.name !== 'default') {
      const endpointLimitConfig = this.perUserRateLimitConfig.getLimit(
        metadata.name,
      );

      return {
        limit: endpointLimitConfig.limit,
        ttl: endpointLimitConfig.ttl || metadata.ttl,
      };
    }

    return {
      limit: perUserLimitConfig.limit,
      ttl: perUserLimitConfig.ttl || metadata.ttl,
    };
  }

  private getRequest(context: ExecutionContext): ThrottlerRequest {
    const { req } = this.getRequestResponse(context) as {
      req: ThrottlerRequest;
    };

    return req;
  }

  private getHeader(req: ThrottlerRequest, name: string): HeaderValue {
    return req.headers?.[name];
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

    if (options.throttlers && Array.isArray(options.throttlers)) {
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
