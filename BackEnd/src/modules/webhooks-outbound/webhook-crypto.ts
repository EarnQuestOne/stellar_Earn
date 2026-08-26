import * as crypto from 'crypto';

/**
 * Cryptographic helpers for the outbound webhook system: at-rest encryption of
 * per-subscription signing secrets, and the HMAC signature scheme used on
 * delivery.
 *
 * ## Signature scheme
 * The signature is computed over `"{timestamp}.{body}"` with HMAC-SHA256 keyed
 * by the subscription secret. The timestamp is delivered alongside the
 * signature (`X-Webhook-Timestamp` / the `t=` field), letting consumers reject
 * replays outside a tolerated clock-skew window.
 */

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;

/**
 * Derives a stable 32-byte encryption key. Prefers `WEBHOOK_ENCRYPTION_KEY`
 * (64 hex chars); otherwise derives one from `JWT_SECRET` via scrypt so the
 * feature works in every environment without extra configuration.
 */
function encryptionKey(): Buffer {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  const material = process.env.JWT_SECRET ?? 'webhook-outbound-default-key';
  return crypto.scryptSync(material, 'webhook-outbound-salt', KEY_LEN);
}

/** Encrypts a plaintext secret to a portable `iv:authTag:ciphertext` hex string. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/** Reverses {@link encryptSecret}. Throws if the ciphertext is malformed or tampered with. */
export function decryptSecret(encoded: string): string {
  const [ivHex, tagHex, dataHex] = encoded.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted secret');
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    encryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/** Generates a new random signing secret (hex). */
export function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes the HMAC-SHA256 signature over `"{timestamp}.{body}"`.
 * Returns the hex digest; the caller assembles the transport header.
 */
export function computeSignature(
  secret: string,
  timestamp: number,
  body: string,
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}
