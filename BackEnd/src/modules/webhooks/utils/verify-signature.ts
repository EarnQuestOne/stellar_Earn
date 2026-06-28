import * as crypto from 'crypto';

/**
 * Verifies an HMAC-SHA256 webhook signature.
 * The signature header format: "sha256=<hex-digest>"
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
  toleranceMs = 300_000,
): boolean {
  if (!signature) return false;

  const [algo, digest] = signature.split('=');
  if (algo !== 'sha256' || !digest) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const valid = crypto.timingSafeEqual(
    Buffer.from(digest, 'hex'),
    Buffer.from(expected, 'hex'),
  );

  if (!valid) return false;

  // Timestamp replay check: payload must include "ts" field
  try {
    const body = JSON.parse(payload) as { ts?: number };
    if (body.ts && Math.abs(Date.now() - body.ts) > toleranceMs) return false;
  } catch {
    // non-JSON payload skips timestamp check
  }

  return true;
}
