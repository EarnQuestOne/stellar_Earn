import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BYPASS_RATE_LIMIT_KEY } from '../decorators/bypass-rate-limit.decorator';

@Injectable()
export class AdminBypassGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isBypassEnabled = this.reflector.get<boolean>(
      BYPASS_RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!isBypassEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Check if user is admin
    if (user?.role === 'admin' || user?.isAdmin === true) {
      return true;
    }

    return true; // Let other guards handle the rate limiting
  }
}
