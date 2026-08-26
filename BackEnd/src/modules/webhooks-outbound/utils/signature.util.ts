import * as crypto from 'crypto';

/**
 * Signing helpers for outbound webhook deliveries (#2306).
 *
 * Wire format — consumers verify exactly like Stripe/GitHub:
 *
 *   X-StellarEarn-Signature: t=<unix-seconds>,v1=<hex-hmac>
 *
 * HMAC-SHA256 over `${t}.${rawBody}` with the subscription's signing secret.
 * The timestamp defeats replay (consumers reject skew > ~5 min); signing the
 * raw body (not a re-serialized object) means the consumer's hash always
 * matches what arrived on the wire.
 */

export interface OutboundSignature {
  timestamp: number;
  signature: string;
}

/** Computes the `t=…,v1=…` header value for a raw JSON body. */
export function signOutboundWebhookPayload(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): OutboundSignature {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${rawBody}`);
  return {
    timestamp,
    signature: `t=${timestamp},v1=${hmac.digest('hex')}`,
  };
}

/** Parses a `t=…,v1=…` header. Returns null when malformed. */
export function parseOutboundWebhookSignature(
  header: string,
): { timestamp: number; signature: string } | null {
  const parts = header.split(',').reduce<Record<string, string>>(
    (acc, part) => {
      const idx = part.indexOf('=');
      if (idx > 0) acc[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
      return acc;
    },
    {} as Record<string, string>,
  );
  const timestamp = Number(parts['t']);
  const v1 = parts['v1'];
  if (
    !Number.isFinite(timestamp) ||
    typeof v1 !== 'string' ||
    v1.length === 0
  ) {
    return null;
  }
  return { timestamp, signature: v1 };
}

/** Constant-time verification of a parsed signature against the raw body. */
export function verifyOutboundWebhookSignature(
  rawBody: string,
  header: string,
  secret: string,
  maxAgeSeconds = 300,
): boolean {
  const parsed = parseOutboundWebhookSignature(header);
  if (!parsed) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > maxAgeSeconds) return false;

  const expected = signOutboundWebhookPayload(
    rawBody,
    secret,
    parsed.timestamp,
  );
  const expectedHex = expected.signature.slice(
    expected.signature.indexOf('v1=') + 3,
  );
  const a = Buffer.from(expectedHex, 'utf8');
  const b = Buffer.from(parsed.signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Generates a fresh signing secret (256 bits, base64url). */
export function generateWebhookSigningSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Symmetric encryption for at-rest storage of signing secrets
 * (aes-256-gcm; key from OUTBOUND_WEBHOOK_ENCRYPTION_KEY, 32 bytes base64).
 * Returns `v1.<iv>.<tag>.<ciphertext>` — versioned so the scheme can evolve.
 */
export function encryptSecret(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'OUTBOUND_WEBHOOK_ENCRYPTION_KEY must be 32 bytes, base64-encoded',
    );
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/** Decrypts a `v1.…` payload produced by {@link encryptSecret}. */
export function decryptSecret(payload: string, keyBase64: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted secret payload');
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'OUTBOUND_WEBHOOK_ENCRYPTION_KEY must be 32 bytes, base64-encoded',
    );
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
