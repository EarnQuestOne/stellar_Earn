import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION_PREFIX = 'v1:';

/**
 * Resolves the master key used to encrypt/decrypt subscription secrets.
 *
 * Provide a 64-character hex string (32 bytes) via the
 * `WEBHOOK_SECRET_ENCRYPTION_KEY` env var. A missing key fails fast — we
 * never want to silently store secrets in plaintext.
 */
function getMasterKey(): Buffer {
  const raw = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'WEBHOOK_SECRET_ENCRYPTION_KEY is not set; cannot encrypt webhook secrets',
    );
  }
  const normalized = raw.replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      'WEBHOOK_SECRET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }
  return Buffer.from(normalized, 'hex');
}

/** Encrypts a plaintext secret. Format: `v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`. */
export function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('hex')}:${authTag.toString(
    'hex',
  )}:${encrypted.toString('hex')}`;
}

/** Decrypts a value produced by {@link encryptSecret}. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(VERSION_PREFIX)) {
    throw new Error('Unsupported secret encryption format');
  }
  const [ivHex, tagHex, dataHex] = stored
    .slice(VERSION_PREFIX.length)
    .split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted secret');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
