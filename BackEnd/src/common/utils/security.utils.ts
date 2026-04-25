import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request } from 'express';

export interface SecurityIssue {
  category:
    | 'csrf'
    | 'signature'
    | 'sqli'
    | 'xss'
    | 'path_traversal'
    | 'template_injection'
    | 'prototype_pollution'
    | 'anomaly'
    | 'ip_reputation';
  reason: string;
  score: number;
}

export interface RequestSignatureVerificationResult {
  valid: boolean;
  reason?: string;
  fingerprint?: string;
}

type SuspiciousEntry = {
  score: number;
  expiresAt: number;
  blockedUntil?: number;
  lastReasons: string[];
};

const suspiciousActivityStore = new Map<string, SuspiciousEntry>();
const requestNonceStore = new Map<string, number>();

const sqlInjectionPatterns = [
  /\b(?:union(?:\s+all)?\s+select|select\s+.+\s+from|insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+table|alter\s+table|sleep\s*\(|benchmark\s*\(|pg_sleep\s*\(|xp_cmdshell)\b/i,
  /(?:'|%27)\s*(?:or|and)\s*(?:'|%27)?\d+(?:'|%27)?\s*=\s*(?:'|%27)?\d+/i,
  /(?:--|#|\/\*)\s*$/i,
];

const xssPatterns = [
  /<script\b[^>]*>/i,
  /<\/script>/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /<iframe\b/i,
  /<img\b[^>]*onerror/i,
  /<svg\b[^>]*onload/i,
];

const traversalPatterns = [/\.\.[/\\]/, /%2e%2e%2f/i, /\/etc\/passwd/i, /\\windows\\system32/i];
const templateInjectionPatterns = [/\$\{.+\}/, /\{\{.+\}\}/, /<%=?[\s\S]+%>/];

const dangerousKeys = new Set([
  '__proto__',
  'prototype',
  'constructor',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

const now = (): number => Date.now();

export const isSafeMethod = (method: string): boolean =>
  ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

export const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) {
      return acc;
    }

    let key: string;
    let value: string;

    try {
      key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
    } catch {
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};

export const serializeCookie = (
  name: string,
  value: string,
  options: {
    maxAgeMs?: number;
    sameSite?: 'Strict' | 'Lax' | 'None';
    secure?: boolean;
    path?: string;
    httpOnly?: boolean;
  } = {},
): string => {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  parts.push(`SameSite=${options.sameSite || 'Strict'}`);

  if (options.maxAgeMs) {
    parts.push(`Max-Age=${Math.max(1, Math.floor(options.maxAgeMs / 1000))}`);
  }

  if (options.secure !== false) {
    parts.push('Secure');
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  return parts.join('; ');
};

export const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const buildBodyHash = (payload: unknown): string => sha256(safeStringify(payload));

export const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '[unserializable]';
  }
};

export const sanitizePrimitiveString = (value: string): string =>
  value
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, 'blocked-protocol:')
    .replace(/vbscript:/gi, 'blocked-protocol:')
    .replace(/data:(?!image\/)/gi, 'blocked-data:')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .trim();

export const isDangerousKey = (key: string): boolean =>
  dangerousKeys.has(key.toLowerCase()) || key.toLowerCase().includes('__proto__');

export const sanitizeObjectDeep = (
  value: unknown,
  depth = 0,
  maxDepth = 8,
): unknown => {
  if (depth > maxDepth) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizePrimitiveString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectDeep(item, depth + 1, maxDepth));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, entry]) => {
        if (!isDangerousKey(key)) {
          acc[key] = sanitizeObjectDeep(entry, depth + 1, maxDepth);
        }
        return acc;
      },
      {},
    );
  }

  return value;
};

export const detectSecurityIssues = (value: unknown): SecurityIssue[] => {
  const candidate = typeof value === 'string' ? value : safeStringify(value);
  const issues: SecurityIssue[] = [];

  if (sqlInjectionPatterns.some((pattern) => pattern.test(candidate))) {
    issues.push({
      category: 'sqli',
      reason: 'SQL injection indicators detected in request payload',
      score: 3,
    });
  }

  if (xssPatterns.some((pattern) => pattern.test(candidate))) {
    issues.push({
      category: 'xss',
      reason: 'Cross-site scripting indicators detected in request payload',
      score: 3,
    });
  }

  if (traversalPatterns.some((pattern) => pattern.test(candidate))) {
    issues.push({
      category: 'path_traversal',
      reason: 'Path traversal indicators detected in request payload',
      score: 2,
    });
  }

  if (templateInjectionPatterns.some((pattern) => pattern.test(candidate))) {
    issues.push({
      category: 'template_injection',
      reason: 'Template injection indicators detected in request payload',
      score: 2,
    });
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value as Record<string, unknown>).some((key) => isDangerousKey(key))
  ) {
    issues.push({
      category: 'prototype_pollution',
      reason: 'Prototype pollution indicators detected in request payload',
      score: 4,
    });
  }

  return issues;
};

export const generateCsrfToken = (secret: string, ttlMs: number): string => {
  const issuedAt = now();
  const nonce = randomBytes(16).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}.${ttlMs}`;
};

export const verifyCsrfToken = (
  token: string,
  secret: string,
  ttlMs: number,
): boolean => {
  const [issuedAtRaw, nonce, signature, tokenTtlRaw] = token.split('.');
  if (!issuedAtRaw || !nonce || !signature) {
    return false;
  }

  const issuedAt = Number(issuedAtRaw);
  const tokenTtl = Number(tokenTtlRaw || ttlMs);

  if (!Number.isFinite(issuedAt) || !Number.isFinite(tokenTtl)) {
    return false;
  }

  if (now() - issuedAt > tokenTtl) {
    return false;
  }

  const payload = `${issuedAt}.${nonce}`;
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

  return safeCompare(signature, expectedSignature);
};

export const verifyRequestSignature = (options: {
  secret: string;
  signature: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  body: unknown;
  toleranceMs: number;
}): RequestSignatureVerificationResult => {
  const requestTimestamp = Number(options.timestamp);
  if (!Number.isFinite(requestTimestamp)) {
    return { valid: false, reason: 'Invalid signature timestamp' };
  }

  if (Math.abs(now() - requestTimestamp) > options.toleranceMs) {
    return { valid: false, reason: 'Expired signature timestamp' };
  }

  const fingerprint = `${options.timestamp}:${options.nonce}`;
  const nonceSeenAt = requestNonceStore.get(fingerprint);
  if (nonceSeenAt && now() - nonceSeenAt < options.toleranceMs) {
    return { valid: false, reason: 'Replayed request signature', fingerprint };
  }

  const rawSignature = options.signature.replace(/^sha256=/i, '');
  const bodyHash = buildBodyHash(options.body);
  const payload = [
    options.timestamp,
    options.nonce,
    options.method.toUpperCase(),
    options.path,
    bodyHash,
  ].join('.');
  const expectedSignature = createHmac('sha256', options.secret)
    .update(payload)
    .digest('hex');

  const valid = safeCompare(rawSignature, expectedSignature);
  if (!valid) {
    return { valid: false, reason: 'Invalid request signature', fingerprint };
  }

  requestNonceStore.set(fingerprint, now());
  cleanupNonceStore(options.toleranceMs);
  return { valid: true, fingerprint };
};

export const recordSuspiciousActivity = (options: {
  key: string;
  issues: SecurityIssue[];
  threshold: number;
  windowMs: number;
  blockDurationMs: number;
}): { score: number; blocked: boolean; blockedUntil?: number } => {
  const currentTime = now();
  const existing = suspiciousActivityStore.get(options.key);
  const entry: SuspiciousEntry =
    existing && existing.expiresAt > currentTime
      ? existing
      : {
          score: 0,
          expiresAt: currentTime + options.windowMs,
          lastReasons: [],
        };

  const totalIssueScore = options.issues.reduce((sum, issue) => sum + issue.score, 0);
  entry.score += totalIssueScore;
  entry.expiresAt = currentTime + options.windowMs;
  entry.lastReasons = options.issues.map((issue) => issue.reason).slice(-5);

  if (entry.score >= options.threshold) {
    entry.blockedUntil = currentTime + options.blockDurationMs;
  }

  suspiciousActivityStore.set(options.key, entry);
  cleanupSuspiciousStore();

  return {
    score: entry.score,
    blocked: !!entry.blockedUntil && entry.blockedUntil > currentTime,
    blockedUntil: entry.blockedUntil,
  };
};

export const isIpBlockedByActivity = (key: string): boolean => {
  const entry = suspiciousActivityStore.get(key);
  return !!entry?.blockedUntil && entry.blockedUntil > now();
};

export const isIpBlockedByReputation = (
  ip: string,
  blockedIps: string[],
  trustedIps: string[],
): boolean => {
  if (!ip || trustedIps.includes(ip)) {
    return false;
  }

  return blockedIps.some((rule) => ipMatchesRule(ip, rule));
};

export const extractAuditPayload = (
  body: unknown,
  maxLength: number,
): string | undefined => {
  const serialized = safeStringify(body);
  if (!serialized || serialized === '{}') {
    return undefined;
  }

  return serialized.length > maxLength
    ? `${serialized.slice(0, maxLength)}...[truncated]`
    : serialized;
};

const safeCompare = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
};

const cleanupSuspiciousStore = (): void => {
  const currentTime = now();
  for (const [key, entry] of suspiciousActivityStore.entries()) {
    if (entry.expiresAt <= currentTime && (!entry.blockedUntil || entry.blockedUntil <= currentTime)) {
      suspiciousActivityStore.delete(key);
    }
  }
};

const cleanupNonceStore = (toleranceMs: number): void => {
  const currentTime = now();
  for (const [fingerprint, createdAt] of requestNonceStore.entries()) {
    if (currentTime - createdAt > toleranceMs) {
      requestNonceStore.delete(fingerprint);
    }
  }
};

const ipMatchesRule = (ip: string, rule: string): boolean => {
  if (!rule.includes('/')) {
    return ip === rule;
  }

  const [baseIp, prefixRaw] = rule.split('/');
  const prefix = Number(prefixRaw);
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const ipBinary = ipv4ToNumber(ip);
  const baseBinary = ipv4ToNumber(baseIp);
  if (ipBinary === null || baseBinary === null) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipBinary & mask) === (baseBinary & mask);
};

const ipv4ToNumber = (ip: string): number | null => {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  );
};
