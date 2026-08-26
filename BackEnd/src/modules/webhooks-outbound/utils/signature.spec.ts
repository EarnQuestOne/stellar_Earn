import { signWebhookPayload, verifyWebhookSignature } from './signature';

describe('outbound webhook signature utils', () => {
  const secret = 'test-secret';

  it('signs payload with the timestamp included in the HMAC material', () => {
    const timestamp = '2026-08-26T12:00:00.000Z';
    const signature = signWebhookPayload({ questId: 'q1' }, secret, timestamp);
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);

    // Same payload+timestamp+secret → deterministic signature.
    const again = signWebhookPayload({ questId: 'q1' }, secret, timestamp);
    expect(again).toBe(signature);
  });

  it('produces a different signature for a different timestamp (replay guard)', () => {
    const signature1 = signWebhookPayload(
      { questId: 'q1' },
      secret,
      '2026-08-26T12:00:00.000Z',
    );
    const signature2 = signWebhookPayload(
      { questId: 'q1' },
      secret,
      '2026-08-26T12:00:01.000Z',
    );
    expect(signature1).not.toBe(signature2);
  });

  it('verifies a valid signature', () => {
    const timestamp = '2026-08-26T12:00:00.000Z';
    const payload = { questId: 'q1' };
    const signature = signWebhookPayload(payload, secret, timestamp);
    expect(verifyWebhookSignature(payload, secret, timestamp, signature)).toBe(
      true,
    );
  });

  it('rejects a signature for the wrong secret', () => {
    const timestamp = '2026-08-26T12:00:00.000Z';
    const payload = { questId: 'q1' };
    const signature = signWebhookPayload(payload, secret, timestamp);
    expect(
      verifyWebhookSignature(
        payload,
        'wrong-secret-value',
        timestamp,
        signature,
      ),
    ).toBe(false);
  });

  it('rejects a tampered payload', () => {
    const timestamp = '2026-08-26T12:00:00.000Z';
    const signature = signWebhookPayload({ questId: 'q1' }, secret, timestamp);
    expect(
      verifyWebhookSignature({ questId: 'q2' }, secret, timestamp, signature),
    ).toBe(false);
  });
});
