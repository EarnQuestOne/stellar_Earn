/**
 * Utility to remove sensitive fields from objects before logging.
 * Recursively masks values for keys containing sensitive patterns.
 * Handles arrays, circular references, and various data types.
 */

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'secret',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'api-key',
  'accesstoken',
  'access_token',
  'access-token',
  'refreshtoken',
  'refresh_token',
  'refresh-token',
  'bearer',
  'credential',
  'private',
  'privatekey',
  'private_key',
  'ssn',
  'social_security',
  'credit_card',
  'creditcard',
  'card_number',
  'cardnumber',
  'cvv',
  'cvc',
  'pin',
  'otp',
  'session',
  'cookie',
  'jwt',
  'x-api-key',
  'x-auth-token',
];

const SENSITIVE_VALUE_PATTERNS = [
  /^Bearer\s+.+$/i,
  /^Basic\s+.+$/i,
  /^\d{3}-\d{2}-\d{4}$/,
  /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  /^[A-Za-z0-9+/]{20,}={0,2}$/,
];

const MASK = '[REDACTED]';
const MAX_DEPTH = 10;
const MAX_STRING_LENGTH = 10000;

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((pattern) => 
    lowerKey.includes(pattern.replace(/[-_]/g, ''))
  );
}

function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function truncateString(value: string): string {
  if (value.length > MAX_STRING_LENGTH) {
    return `${value.substring(0, MAX_STRING_LENGTH)}... [truncated]`;
  }
  return value;
}

export function sanitizeLogObject(
  obj: unknown,
  seen = new WeakSet(),
  depth = 0,
): unknown {
  if (depth > MAX_DEPTH) {
    return '[Max depth exceeded]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    if (isSensitiveValue(obj)) {
      return MASK;
    }
    return truncateString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (typeof obj === 'function') {
    return '[Function]';
  }

  if (typeof obj === 'symbol') {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeLogObject(obj.message, seen, depth + 1) as string,
      stack: obj.stack,
    };
  }

  if (typeof obj !== 'object') {
    return String(obj);
  }

  if (seen.has(obj as object)) {
    return '[Circular Reference]';
  }
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogObject(item, seen, depth + 1));
  }

  if (obj instanceof Map) {
    const sanitizedMap: Record<string, unknown> = {};
    obj.forEach((value, key) => {
      const keyStr = String(key);
      sanitizedMap[keyStr] = isSensitiveKey(keyStr)
        ? MASK
        : sanitizeLogObject(value, seen, depth + 1);
    });
    return sanitizedMap;
  }

  if (obj instanceof Set) {
    return Array.from(obj).map((item) => sanitizeLogObject(item, seen, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  const objRecord = obj as Record<string, unknown>;

  for (const key of Object.keys(objRecord)) {
    const value = objRecord[key];
    
    if (isSensitiveKey(key)) {
      sanitized[key] = MASK;
    } else {
      sanitized[key] = sanitizeLogObject(value, seen, depth + 1);
    }
  }

  return sanitized;
}

export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
    'x-refresh-token',
    'proxy-authorization',
  ];

  const sanitized: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = MASK;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth', 'api_key', 'apikey'];
    
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, MASK);
      }
    });

    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

export function sanitizeBody(body: unknown): unknown {
  return sanitizeLogObject(body);
}
