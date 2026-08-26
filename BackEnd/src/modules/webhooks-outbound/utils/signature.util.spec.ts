import {
  signOutboundWebhookPayload,
  verifyOutboundWebhookSignature,
  parseOutboundWebhookSignature,
  encryptSecret,
  decryptSecret,
  generateWebhookSigningSecret,
} from './signature.util';

describe('outbound webhook signature util', () => {
  const secret = 'whsec_test-secret-for-hmac-verification';
  const body = JSON.stringify({
    id: 'd-1',
    eventType: 'payout.processed',
    data: { payoutId: 'p-1' },
  });

  describe('sign / verify round-trip', () => {
    it('verifies a signature it produced', () => {
      const { signature } = signOutboundWebhookPayload(body, secret);
      expect(verifyOutboundWebhookSignature(body, signature, secret)).toBe(
        true,
      );
    });

    it('rejects a tampered body', () => {
      const { signature } = signOutboundWebhookPayload(body, secret);
      const tampered = body.replace('p-1', 'p-2');
      expect(verifyOutboundWebhookSignature(tampered, signature, secret)).toBe(
        false,
      );
    });

    it('rejects the wrong secret', () => {
      const { signature } = signOutboundWebhookPayload(body, secret);
      expect(
        verifyOutboundWebhookSignature(body, signature, 'whsec_other'),
      ).toBe(false);
    });

    it('rejects signatures older than the replay window', () => {
      const stale = Math.floor(Date.now() / 1000) - 3600;
      const { signature } = signOutboundWebhookPayload(body, secret, stale);
      expect(verifyOutboundWebhookSignature(body, signature, secret)).toBe(
        false,
      );
    });

    it('rejects malformed headers', () => {
      expect(parseOutboundWebhookSignature('garbage')).toBeNull();
      expect(parseOutboundWebhookSignature('t=abc,v1=')).toBeNull();
      expect(
        verifyOutboundWebhookSignature(body, 'not-a-signature', secret),
      ).toBe(false);
    });

    it('signs the timestamp together with the body (replay binding)', () => {
      const t = Math.floor(Date.now() / 1000);
      const a = signOutboundWebhookPayload(body, secret, t);
      const b = signOutboundWebhookPayload(body, secret, t + 1);
      expect(a.signature).not.toEqual(b.signature);
    });
  });

  describe('secret generation', () => {
    it('generates unique 256-bit secrets', () => {
      const s1 = generateWebhookSigningSecret();
      const s2 = generateWebhookSigningSecret();
      expect(s1).not.toEqual(s2);
      expect(Buffer.from(s1, 'base64url').length).toBe(32);
    });
  });

  describe('secret encryption at rest', () => {
    // 64 hex chars = exactly 32 bytes.
    const key = Buffer.from(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      'hex',
    ).toString('base64');

    it('round-trips a secret', () => {
      const ciphertext = encryptSecret('whsec_plaintext', key);
      expect(ciphertext.startsWith('v1.')).toBe(true);
      expect(ciphertext).not.toContain('whsec_plaintext');
      expect(decryptSecret(ciphertext, key)).toBe('whsec_plaintext');
    });

    it('produces a different ciphertext per call (random IV)', () => {
      expect(encryptSecret('same', key)).not.toEqual(
        encryptSecret('same', key),
      );
    });

    it('fails closed on a wrong key (GCM auth)', () => {
      const ciphertext = encryptSecret('whsec_plaintext', key);
      const otherKey = Buffer.alloc(32, 7).toString('base64');
      expect(() => decryptSecret(ciphertext, otherKey)).toThrow();
    });

    it('rejects malformed ciphertexts', () => {
      expect(() => decryptSecret('v2.broken', key)).toThrow(/malformed/i);
    });

    it('rejects keys of the wrong length', () => {
      const shortKey = Buffer.alloc(16).toString('base64');
      expect(() => encryptSecret('x', shortKey)).toThrow(/32 bytes/);
    });
  });
});
