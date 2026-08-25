import { verifyWebhookSignature, generateWebhookSignature } from './signature';

/**
 * Unit tests for webhook signature verification.
 *
 * Covers:
 *  - Timing-safe comparison verification
 *  - Secret buffer caching behavior
 *  - Edge cases for signature formats
 *  - Regression tests for performance optimizations
 */
describe('Webhook Signature Verification', () => {
  const GITHUB_SECRET = 'github-test-secret-value';
  const API_SECRET = 'api-test-secret-value';
  const payload = {
    repository: { full_name: 'org/repo' },
    ref: 'refs/heads/main',
  };

  describe('GitHub signature verification', () => {
    it('should verify valid GitHub signatures using timing-safe comparison', () => {
      const signature = generateWebhookSignature(
        payload,
        GITHUB_SECRET,
        'github',
      );
      const result = verifyWebhookSignature(
        payload,
        signature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(true);
    });

    it('should reject invalid GitHub signatures using timing-safe comparison', () => {
      const invalidSignature = `sha256=${'0'.repeat(64)}`;
      const result = verifyWebhookSignature(
        payload,
        invalidSignature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(false);
    });

    it('should reject GitHub signatures with incorrect format', () => {
      const malformedSignature = 'invalid-format';
      const result = verifyWebhookSignature(
        payload,
        malformedSignature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(false);
    });

    it('should handle GitHub signatures with sha256= prefix correctly', () => {
      const signature = generateWebhookSignature(
        payload,
        GITHUB_SECRET,
        'github',
      );
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      const result = verifyWebhookSignature(
        payload,
        signature,
        GITHUB_SECRET,
        'github',
      );
      expect(result).toBe(true);
    });
  });

  describe('API signature verification', () => {
    it('should verify valid API signatures using timing-safe comparison', () => {
      const signature = generateWebhookSignature(payload, API_SECRET, 'api');
      const result = verifyWebhookSignature(
        payload,
        signature,
        API_SECRET,
        'api',
      );

      expect(result).toBe(true);
    });

    it('should reject invalid API signatures using timing-safe comparison', () => {
      const invalidSignature = `hmac-sha256=${'0'.repeat(64)}`;
      const result = verifyWebhookSignature(
        payload,
        invalidSignature,
        API_SECRET,
        'api',
      );

      expect(result).toBe(false);
    });

    it('should reject API signatures with incorrect format', () => {
      const malformedSignature = 'invalid-format';
      const result = verifyWebhookSignature(
        payload,
        malformedSignature,
        API_SECRET,
        'api',
      );

      expect(result).toBe(false);
    });

    it('should handle API signatures with hmac-sha256= prefix correctly', () => {
      const signature = generateWebhookSignature(payload, API_SECRET, 'api');
      expect(signature).toMatch(/^hmac-sha256=[a-f0-9]{64}$/);

      const result = verifyWebhookSignature(
        payload,
        signature,
        API_SECRET,
        'api',
      );
      expect(result).toBe(true);
    });
  });

  describe('Secret buffer caching behavior', () => {
    it('should consistently verify signatures with the same secret (caching test)', () => {
      const signature = generateWebhookSignature(
        payload,
        GITHUB_SECRET,
        'github',
      );

      // Verify multiple times to ensure caching doesn't affect correctness
      const results = Array.from({ length: 10 }, () =>
        verifyWebhookSignature(payload, signature, GITHUB_SECRET, 'github'),
      );

      expect(results.every((r) => r === true)).toBe(true);
    });

    it('should handle different secrets correctly (cache isolation test)', () => {
      const secret1 = 'secret-one';
      const secret2 = 'secret-two';
      const signature1 = generateWebhookSignature(payload, secret1, 'github');
      const signature2 = generateWebhookSignature(payload, secret2, 'github');

      const result1 = verifyWebhookSignature(
        payload,
        signature1,
        secret1,
        'github',
      );
      const result2 = verifyWebhookSignature(
        payload,
        signature2,
        secret2,
        'github',
      );

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // Cross-verification should fail
      const crossResult1 = verifyWebhookSignature(
        payload,
        signature1,
        secret2,
        'github',
      );
      const crossResult2 = verifyWebhookSignature(
        payload,
        signature2,
        secret1,
        'github',
      );

      expect(crossResult1).toBe(false);
      expect(crossResult2).toBe(false);
    });

    it('should handle different providers with the same secret correctly', () => {
      const sharedSecret = 'shared-secret';
      const githubSignature = generateWebhookSignature(
        payload,
        sharedSecret,
        'github',
      );
      const apiSignature = generateWebhookSignature(
        payload,
        sharedSecret,
        'api',
      );

      const githubResult = verifyWebhookSignature(
        payload,
        githubSignature,
        sharedSecret,
        'github',
      );
      const apiResult = verifyWebhookSignature(
        payload,
        apiSignature,
        sharedSecret,
        'api',
      );

      expect(githubResult).toBe(true);
      expect(apiResult).toBe(true);

      // Cross-provider verification should fail
      const githubCrossResult = verifyWebhookSignature(
        payload,
        apiSignature,
        sharedSecret,
        'github',
      );
      const apiCrossResult = verifyWebhookSignature(
        payload,
        githubSignature,
        sharedSecret,
        'api',
      );

      expect(githubCrossResult).toBe(false);
      expect(apiCrossResult).toBe(false);
    });
  });

  describe('Edge cases and regression tests', () => {
    it('should handle empty payloads correctly', () => {
      const emptyPayload = '';
      const signature = generateWebhookSignature(
        emptyPayload,
        GITHUB_SECRET,
        'github',
      );
      const result = verifyWebhookSignature(
        emptyPayload,
        signature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(true);
    });

    it('should handle large payloads correctly', () => {
      const largePayload = { data: 'x'.repeat(10000) };
      const signature = generateWebhookSignature(
        largePayload,
        GITHUB_SECRET,
        'github',
      );
      const result = verifyWebhookSignature(
        payload,
        signature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(false); // Different payload should fail
    });

    it('should handle string payloads correctly', () => {
      const stringPayload = 'plain-text-payload';
      const signature = generateWebhookSignature(
        stringPayload,
        GITHUB_SECRET,
        'github',
      );
      const result = verifyWebhookSignature(
        stringPayload,
        signature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(true);
    });

    it('should be case-sensitive for signature hex values', () => {
      const signature = generateWebhookSignature(
        payload,
        GITHUB_SECRET,
        'github',
      );
      const uppercaseSignature = signature.toUpperCase();

      const result = verifyWebhookSignature(
        payload,
        uppercaseSignature,
        GITHUB_SECRET,
        'github',
      );

      expect(result).toBe(false); // Uppercase should not match
    });

    it('should handle unsupported providers gracefully', () => {
      const signature = 'some-signature';
      const result = verifyWebhookSignature(
        payload,
        signature,
        GITHUB_SECRET,
        'unsupported',
      );

      expect(result).toBe(false);
    });
  });

  describe('Signature generation', () => {
    it('should generate consistent signatures for the same input', () => {
      const signature1 = generateWebhookSignature(
        payload,
        GITHUB_SECRET,
        'github',
      );
      const signature2 = generateWebhookSignature(
        payload,
        GITHUB_SECRET,
        'github',
      );

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const signature1 = generateWebhookSignature(payload, 'secret1', 'github');
      const signature2 = generateWebhookSignature(payload, 'secret2', 'github');

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const signature1 = generateWebhookSignature(
        { data: 'one' },
        GITHUB_SECRET,
        'github',
      );
      const signature2 = generateWebhookSignature(
        { data: 'two' },
        GITHUB_SECRET,
        'github',
      );

      expect(signature1).not.toBe(signature2);
    });

    it('should throw error for unsupported provider in generation', () => {
      expect(() => {
        generateWebhookSignature(payload, GITHUB_SECRET, 'unsupported');
      }).toThrow('Unsupported provider: unsupported');
    });
  });
});
