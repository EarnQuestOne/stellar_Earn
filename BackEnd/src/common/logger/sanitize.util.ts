/**
 * Utility to remove sensitive fields from objects before logging.
 * Recursively masks values for keys like 'password', 'token', 'secret', 'authorization'.
 */

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization'];

export function sanitizeLogObject(
  obj: Record<string, any>,
): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      sanitized[key] = '*****';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
