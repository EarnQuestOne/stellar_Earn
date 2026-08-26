import { encryptSecret, decryptSecret } from './secret-encryption';

const TEST_KEY = 'c'.repeat(64); // 64 hex chars

describe('secret-encryption', () => {
  const originalKey = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
    } else {
      process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = originalKey;
    }
  });

  it('round-trips a secret', () => {
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = TEST_KEY;
    const plaintext = 'super-secret-webhook-value';
    const stored = encryptSecret(plaintext);
    expect(stored).not.toContain(plaintext);
    expect(stored.startsWith('v1:')).toBe(true);
    expect(decryptSecret(stored)).toBe(plaintext);
  });

  it('produces unique ciphertext per call (random IV)', () => {
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = TEST_KEY;
    const first = encryptSecret('same-value');
    const second = encryptSecret('same-value');
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe('same-value');
    expect(decryptSecret(second)).toBe('same-value');
  });

  it('fails fast when the master key is missing', () => {
    delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
    expect(() => encryptSecret('anything')).toThrow(
      'WEBHOOK_SECRET_ENCRYPTION_KEY is not set',
    );
  });

  it('rejects a malformed stored value', () => {
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = TEST_KEY;
    expect(() => decryptSecret('not-encrypted')).toThrow(
      'Unsupported secret encryption format',
    );
  });
});
