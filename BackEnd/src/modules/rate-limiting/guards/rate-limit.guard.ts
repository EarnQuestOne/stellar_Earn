import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { IpRateLimitService } from '../services/ip-rate-limit.service';
import { UserRateLimitService } from '../services/user-rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private ipRateLimitService: IpRateLimitService,
    private userRateLimitService: UserRateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const ip = this.getClientIp(request);
    const routePath = request.route?.path || request.url;
    const key = `${request.method}:${routePath}`;

    let isLimited = false;
    let resetTime = Date.now();
    let remaining = 0;

    if (rateLimitOptions.type === 'ip') {
      const result = this.ipRateLimitService.increment(
        ip,
        key,
        rateLimitOptions.limit,
        rateLimitOptions.windowMs,
      );
      isLimited = result.count > rateLimitOptions.limit;
      resetTime = result.resetTime;
      remaining = result.remaining;
    } else if (rateLimitOptions.type === 'user') {
      const userId = (request as any).user?.id;
      if (!userId) {
        return true; // Allow unauthenticated users to pass
      }
      const result = this.userRateLimitService.increment(
        userId,
        key,
        rateLimitOptions.limit,
        rateLimitOptions.windowMs,
      );
      isLimited = result.count > rateLimitOptions.limit;
      resetTime = result.resetTime;
      remaining = result.remaining;
    } else if (rateLimitOptions.type === 'combined') {
      const ipResult = this.ipRateLimitService.increment(
        ip,
        key,
        rateLimitOptions.limit,
        rateLimitOptions.windowMs,
      );
      const userId = (request as any).user?.id;
      const userResult = userId
        ? this.userRateLimitService.increment(
            userId,
            key,
            rateLimitOptions.limit,
            rateLimitOptions.windowMs,
          )
        : null;

      isLimited = ipResult.count > rateLimitOptions.limit || (userResult?.count ?? 0) > rateLimitOptions.limit;
      resetTime = Math.max(ipResult.resetTime, userResult?.resetTime ?? 0);
      remaining = Math.min(ipResult.remaining, userResult?.remaining ?? rateLimitOptions.limit);
    }

    // Add rate limit headers
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (isLimited) {
      const message = rateLimitOptions.message || 'Too many requests';
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    return request.socket.remoteAddress || '127.0.0.1';
  }
}
