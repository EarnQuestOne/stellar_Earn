import { ConfigService } from '@nestjs/config';
import { HelmetOptions } from 'helmet';

export interface SecurityHeadersConfig {
  csrfCookieName: string;
  csrfHeaderName: string;
  signatureHeaderName: string;
  signatureTimestampHeaderName: string;
  signatureNonceHeaderName: string;
  auditHeaderName: string;
}

export interface SecurityLimitsConfig {
  jsonBodyLimit: string;
  urlencodedBodyLimit: string;
  maxContentLengthBytes: number;
  maxHeaderCount: number;
  maxUrlLength: number;
  maxParameterDepth: number;
}

export interface SecurityDetectionConfig {
  blockSuspiciousRequests: boolean;
  suspiciousScoreThreshold: number;
  suspiciousWindowMs: number;
  suspiciousBlockDurationMs: number;
  csrfTtlMs: number;
  signatureToleranceMs: number;
  maxAuditBodyLength: number;
}

export interface SecurityReputationConfig {
  blockedIps: string[];
  trustedIps: string[];
  trustedProxyHeaders: string[];
}

export interface ApplicationSecurityConfig {
  environment: string;
  secrets: {
    csrf: string;
    requestSignature: string;
  };
  allowedOrigins: string[];
  headers: SecurityHeadersConfig;
  limits: SecurityLimitsConfig;
  detection: SecurityDetectionConfig;
  reputation: SecurityReputationConfig;
  excludedPaths: {
    csrf: string[];
    audit: string[];
  };
}

const toList = (value?: string): string[] =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const toBytes = (value: string, fallback: number): number => {
  const match = value.trim().match(/^(\d+)(b|kb|mb)?$/i);
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'b').toLowerCase();

  if (unit === 'mb') {
    return amount * 1024 * 1024;
  }

  if (unit === 'kb') {
    return amount * 1024;
  }

  return amount;
};

export const getApplicationSecurityConfig = (
  configService: ConfigService,
): ApplicationSecurityConfig => {
  const environment = configService.get<string>('NODE_ENV', 'development');
  const jsonBodyLimit = configService.get<string>('SECURITY_JSON_BODY_LIMIT', '1mb');
  const urlencodedBodyLimit = configService.get<string>(
    'SECURITY_URLENCODED_BODY_LIMIT',
    '256kb',
  );

  return {
    environment,
    secrets: {
      csrf:
        configService.get<string>('CSRF_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'local-dev-csrf-secret',
      requestSignature:
        configService.get<string>('REQUEST_SIGNATURE_SECRET') ||
        configService.get<string>('WEBHOOK_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'local-dev-request-signature-secret',
    },
    allowedOrigins: toList(configService.get<string>('CORS_ORIGIN')).map((origin) =>
      origin.replace(/\/$/, ''),
    ),
    headers: {
      csrfCookieName: configService.get<string>('CSRF_COOKIE_NAME', '__Host-csrf-token'),
      csrfHeaderName: configService.get<string>('CSRF_HEADER_NAME', 'x-csrf-token'),
      signatureHeaderName: configService.get<string>(
        'REQUEST_SIGNATURE_HEADER',
        'x-request-signature',
      ),
      signatureTimestampHeaderName: configService.get<string>(
        'REQUEST_SIGNATURE_TIMESTAMP_HEADER',
        'x-signature-timestamp',
      ),
      signatureNonceHeaderName: configService.get<string>(
        'REQUEST_SIGNATURE_NONCE_HEADER',
        'x-signature-nonce',
      ),
      auditHeaderName: configService.get<string>('SECURITY_AUDIT_HEADER', 'x-security-audit-id'),
    },
    limits: {
      jsonBodyLimit,
      urlencodedBodyLimit,
      maxContentLengthBytes: toBytes(
        configService.get<string>('SECURITY_MAX_CONTENT_LENGTH', jsonBodyLimit),
        1024 * 1024,
      ),
      maxHeaderCount: configService.get<number>('SECURITY_MAX_HEADERS', 80),
      maxUrlLength: configService.get<number>('SECURITY_MAX_URL_LENGTH', 2048),
      maxParameterDepth: configService.get<number>('SECURITY_MAX_PARAM_DEPTH', 8),
    },
    detection: {
      blockSuspiciousRequests: configService.get<boolean>(
        'SECURITY_BLOCK_SUSPICIOUS',
        true,
      ),
      suspiciousScoreThreshold: configService.get<number>(
        'SECURITY_SUSPICIOUS_SCORE_THRESHOLD',
        5,
      ),
      suspiciousWindowMs: configService.get<number>(
        'SECURITY_SUSPICIOUS_WINDOW_MS',
        15 * 60 * 1000,
      ),
      suspiciousBlockDurationMs: configService.get<number>(
        'SECURITY_SUSPICIOUS_BLOCK_DURATION_MS',
        30 * 60 * 1000,
      ),
      csrfTtlMs: configService.get<number>('CSRF_TTL_MS', 2 * 60 * 60 * 1000),
      signatureToleranceMs: configService.get<number>(
        'REQUEST_SIGNATURE_TOLERANCE_MS',
        5 * 60 * 1000,
      ),
      maxAuditBodyLength: configService.get<number>('SECURITY_AUDIT_BODY_MAX_LENGTH', 1024),
    },
    reputation: {
      blockedIps: toList(configService.get<string>('SECURITY_BLOCKED_IPS')),
      trustedIps: toList(configService.get<string>('SECURITY_TRUSTED_IPS')),
      trustedProxyHeaders: ['x-forwarded-for', 'x-real-ip'],
    },
    excludedPaths: {
      csrf: ['/api/v1/webhooks', '/api/webhooks', '/api/docs'],
      audit: ['/api/v1/health', '/api/health'],
    },
  };
};

/**
 * Security configuration for Helmet middleware.
 */
export const getSecurityConfig = (configService: ConfigService): HelmetOptions => {
  const appSecurity = getApplicationSecurityConfig(configService);
  const directives: NonNullable<
    HelmetOptions['contentSecurityPolicy']
  >['directives'] = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: ["'self'", 'https://api.stellar.org', ...appSecurity.allowedOrigins],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
  };

  if (appSecurity.environment === 'production') {
    directives.upgradeInsecureRequests = [];
  }

  return {
    contentSecurityPolicy: {
      directives,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  };
};
