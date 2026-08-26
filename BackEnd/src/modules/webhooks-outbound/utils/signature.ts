import * as crypto from 'crypto';

/**
 * Outbound webhook signature scheme.
 *
 * Each delivery carries:
 *   X-Webhook-Timestamp: <ISO-8601 timestamp>
 *   X-Webhook-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<body>">
 *
 * Including the timestamp in the signed material prevents replay: consumers
 * can reject deliveries whose timestamp is older than a small skew window.
 */
export function signWebhookPayload(
  payload: unknown,
  secret: string,
  timestamp: string,
): string {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedMaterial = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedMaterial, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/** Constant-time comparison helper for tests/verification. */
export function verifyWebhookSignature(
  payload: unknown,
  secret: string,
  timestamp: string,
  signature: string,
): boolean {
  const expected = signWebhookPayload(payload, secret, timestamp);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
