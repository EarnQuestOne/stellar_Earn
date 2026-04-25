import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);
  private readonly whitelist: string[];

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('ADMIN_IP_WHITELIST', '');
    this.whitelist = raw
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    // If no whitelist configured, allow all (open by default in dev)
    if (this.whitelist.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    if (this.whitelist.includes(clientIp)) {
      return true;
    }

    this.logger.warn(
      `Admin access denied for IP: ${clientIp} | path: ${request.method} ${request.originalUrl}`,
    );
    throw new ForbiddenException('Access denied: IP not whitelisted');
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
