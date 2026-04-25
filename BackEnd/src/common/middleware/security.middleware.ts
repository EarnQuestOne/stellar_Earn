import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import {
  detectSecurityIssues,
  extractAuditPayload,
  generateCsrfToken,
  getClientIp,
  isIpBlockedByActivity,
  isIpBlockedByReputation,
  isSafeMethod,
  parseCookies,
  recordSuspiciousActivity,
  sanitizeObjectDeep,
  serializeCookie,
  verifyRequestSignature,
} from '../utils/security.utils';
import { getApplicationSecurityConfig } from '../../config/security.config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const securityConfig = getApplicationSecurityConfig(this.configService);
    const ipAddress = getClientIp(req);
    const auditId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    res.setHeader(securityConfig.headers.auditHeaderName, auditId);
    this.setAdditionalSecurityHeaders(res);
    this.enforceRequestConstraints(
      req,
      securityConfig.limits.maxContentLengthBytes,
      securityConfig.limits.maxHeaderCount,
      securityConfig.limits.maxUrlLength,
    );
    this.enforceIpReputation(
      ipAddress,
      securityConfig.reputation.blockedIps,
      securityConfig.reputation.trustedIps,
    );
    this.sanitizeQueryParams(req, securityConfig.limits.maxParameterDepth);

    const issues = this.collectIssues(req, ipAddress, securityConfig);
    const suspiciousActivity = issues.length
      ? recordSuspiciousActivity({
          key: ipAddress,
          issues,
          threshold: securityConfig.detection.suspiciousScoreThreshold,
          windowMs: securityConfig.detection.suspiciousWindowMs,
          blockDurationMs: securityConfig.detection.suspiciousBlockDurationMs,
        })
      : { score: 0, blocked: false as const };

    if (isIpBlockedByActivity(ipAddress) || suspiciousActivity.blocked) {
      this.logSecurityAudit(
        req,
        auditId,
        ipAddress,
        issues,
        'blocked_activity_threshold',
        securityConfig.detection.maxAuditBodyLength,
      );
      throw new ForbiddenException('Suspicious activity threshold exceeded');
    }

    const signatureStatus = this.verifyOptionalRequestSignature(
      req,
      securityConfig,
      auditId,
      ipAddress,
    );
    res.locals.securityContext = {
      auditId,
      ipAddress,
      signatureVerified: signatureStatus.verified,
      signatureFingerprint: signatureStatus.fingerprint,
    };

    this.issueCsrfTokenIfNeeded(req, res, securityConfig);

    if (
      issues.length > 0 &&
      securityConfig.detection.blockSuspiciousRequests &&
      issues.some((issue) => issue.score >= 3)
    ) {
      this.logSecurityAudit(
        req,
        auditId,
        ipAddress,
        issues,
        'blocked_request',
        securityConfig.detection.maxAuditBodyLength,
      );
      throw new BadRequestException('Suspicious request blocked by security policy');
    }

    if (issues.length > 0) {
      this.logSecurityAudit(
        req,
        auditId,
        ipAddress,
        issues,
        'flagged_request',
        securityConfig.detection.maxAuditBodyLength,
      );
    }

    next();
  }

  private setAdditionalSecurityHeaders(res: Response): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    res.removeHeader('X-Powered-By');

    if (!res.getHeader('Strict-Transport-Security')) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
  }

  private enforceRequestConstraints(
    req: Request,
    maxContentLengthBytes: number,
    maxHeaderCount: number,
    maxUrlLength: number,
  ): void {
    const contentLengthHeader = req.headers['content-length'];
    const contentLength =
      typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : undefined;

    if (contentLength && contentLength > maxContentLengthBytes) {
      throw new PayloadTooLargeException('Request payload exceeds configured size limit');
    }

    if (Object.keys(req.headers).length > maxHeaderCount) {
      throw new BadRequestException('Request contains too many headers');
    }

    if (req.originalUrl.length > maxUrlLength) {
      throw new BadRequestException('Request URL exceeds allowed length');
    }

    const contentType = req.get('content-type');
    if (
      !isSafeMethod(req.method) &&
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('application/x-www-form-urlencoded') &&
      !contentType.includes('multipart/form-data')
    ) {
      throw new BadRequestException('Unsupported content type');
    }
  }

  private enforceIpReputation(
    ipAddress: string,
    blockedIps: string[],
    trustedIps: string[],
  ): void {
    if (isIpBlockedByReputation(ipAddress, blockedIps, trustedIps)) {
      throw new ForbiddenException('Request blocked by IP reputation policy');
    }
  }

  private sanitizeQueryParams(req: Request, maxDepth: number): void {
    if (req.query) {
      req.query = sanitizeObjectDeep(req.query, 0, maxDepth) as Request['query'];
    }
  }

  private collectIssues(
    req: Request,
    ipAddress: string,
    securityConfig: ReturnType<typeof getApplicationSecurityConfig>,
  ) {
    const issues = [
      ...detectSecurityIssues(req.originalUrl),
      ...detectSecurityIssues(req.query),
      ...detectSecurityIssues(req.body),
      ...detectSecurityIssues(req.headers['user-agent'] || ''),
    ];

    const userAgent = req.get('user-agent') || '';
    if (!userAgent || userAgent.length < 6) {
      issues.push({
        category: 'anomaly',
        reason: 'Missing or suspiciously short user-agent header',
        score: 1,
      });
    }

    if (isIpBlockedByActivity(ipAddress)) {
      issues.push({
        category: 'anomaly',
        reason: 'IP is temporarily blocked after repeated suspicious requests',
        score: securityConfig.detection.suspiciousScoreThreshold,
      });
    }

    return issues;
  }

  private verifyOptionalRequestSignature(
    req: Request,
    securityConfig: ReturnType<typeof getApplicationSecurityConfig>,
    auditId: string,
    ipAddress: string,
  ): { verified: boolean; fingerprint?: string } {
    const signature = req.get(securityConfig.headers.signatureHeaderName);
    const timestamp = req.get(securityConfig.headers.signatureTimestampHeaderName);
    const nonce = req.get(securityConfig.headers.signatureNonceHeaderName);
    const signatureHeadersPresent = [signature, timestamp, nonce].some(Boolean);

    if (!signatureHeadersPresent) {
      return { verified: false };
    }

    if (!signature || !timestamp || !nonce) {
      this.logSecurityAudit(
        req,
        auditId,
        ipAddress,
        [
          {
            category: 'signature',
            reason: 'Incomplete request signature headers',
            score: 4,
          },
        ],
        'invalid_signature_headers',
        securityConfig.detection.maxAuditBodyLength,
      );
      throw new UnauthorizedException('Invalid request signature');
    }

    const verification = verifyRequestSignature({
      secret: securityConfig.secrets.requestSignature,
      signature,
      timestamp,
      nonce,
      method: req.method,
      path: req.originalUrl,
      body: req.body,
      toleranceMs: securityConfig.detection.signatureToleranceMs,
    });

    if (!verification.valid) {
      this.logSecurityAudit(
        req,
        auditId,
        ipAddress,
        [
          {
            category: 'signature',
            reason: verification.reason || 'Signature verification failed',
            score: 4,
          },
        ],
        'invalid_signature',
        securityConfig.detection.maxAuditBodyLength,
      );
      throw new UnauthorizedException('Invalid request signature');
    }

    return {
      verified: true,
      fingerprint: verification.fingerprint,
    };
  }

  private issueCsrfTokenIfNeeded(
    req: Request,
    res: Response,
    securityConfig: ReturnType<typeof getApplicationSecurityConfig>,
  ): void {
    if (!isSafeMethod(req.method)) {
      return;
    }

    const cookies = parseCookies(req.headers.cookie);
    const existingToken = cookies[securityConfig.headers.csrfCookieName];
    const token =
      existingToken ||
      generateCsrfToken(
        securityConfig.secrets.csrf,
        securityConfig.detection.csrfTtlMs,
      );

    res.setHeader(securityConfig.headers.csrfHeaderName, token);

    if (!existingToken) {
      res.append(
        'Set-Cookie',
        serializeCookie(securityConfig.headers.csrfCookieName, token, {
          maxAgeMs: securityConfig.detection.csrfTtlMs,
          secure: securityConfig.environment === 'production',
          sameSite: 'Strict',
          path: '/',
        }),
      );
    }
  }

  private logSecurityAudit(
    req: Request,
    auditId: string,
    ipAddress: string,
    issues: Array<{ category: string; reason: string; score: number }>,
    outcome: string,
    maxAuditBodyLength: number,
  ): void {
    const shouldSkipAudit = ['/api/v1/health', '/api/health'].some((path) =>
      req.originalUrl.startsWith(path),
    );

    if (shouldSkipAudit) {
      return;
    }

    this.logger.warn(
      JSON.stringify({
        event: 'security_audit',
        auditId,
        outcome,
        ipAddress,
        method: req.method,
        path: req.originalUrl,
        userAgent: req.get('user-agent'),
        issues,
        body: extractAuditPayload(req.body, maxAuditBodyLength),
      }),
    );
  }
}
