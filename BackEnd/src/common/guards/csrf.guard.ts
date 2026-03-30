import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { getApplicationSecurityConfig } from '../../config/security.config';
import {
  getClientIp,
  isSafeMethod,
  parseCookies,
  verifyCsrfToken,
} from '../utils/security.utils';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const securityConfig = getApplicationSecurityConfig(this.configService);

    if (isSafeMethod(request.method)) {
      return true;
    }

    if (
      securityConfig.excludedPaths.csrf.some((path) =>
        request.originalUrl.startsWith(path),
      )
    ) {
      return true;
    }

    const securityContext = (request.res?.locals?.securityContext || {}) as {
      signatureVerified?: boolean;
    };
    if (securityContext.signatureVerified) {
      return true;
    }

    if (!this.requiresCsrfValidation(request)) {
      return true;
    }

    const cookies = parseCookies(request.headers.cookie);
    const cookieToken = cookies[securityConfig.headers.csrfCookieName];
    const headerToken = request.get(securityConfig.headers.csrfHeaderName);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      this.logFailure(request, 'Missing or mismatched CSRF token');
      throw new ForbiddenException('Invalid CSRF token');
    }

    if (
      !verifyCsrfToken(
        headerToken,
        securityConfig.secrets.csrf,
        securityConfig.detection.csrfTtlMs,
      )
    ) {
      this.logFailure(request, 'Expired or forged CSRF token');
      throw new ForbiddenException('Invalid CSRF token');
    }

    const origin = request.get('origin');
    if (origin && !this.isAllowedOrigin(origin, securityConfig.allowedOrigins)) {
      this.logFailure(request, `Untrusted origin ${origin}`);
      throw new ForbiddenException('Untrusted request origin');
    }

    return true;
  }

  private requiresCsrfValidation(request: Request): boolean {
    const fetchSite = request.get('sec-fetch-site');

    return Boolean(
      request.headers.cookie ||
        request.get('origin') ||
        request.get('referer') ||
        (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site'),
    );
  }

  private isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
    if (allowedOrigins.length === 0) {
      return true;
    }

    return allowedOrigins.includes(origin.replace(/\/$/, ''));
  }

  private logFailure(request: Request, reason: string): void {
    this.logger.warn(
      JSON.stringify({
        event: 'csrf_violation',
        reason,
        path: request.originalUrl,
        method: request.method,
        ipAddress: getClientIp(request),
      }),
    );
  }
}
