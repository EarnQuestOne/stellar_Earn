import { TraceIdUtil } from '#src/modules/trace/trace-id.util';

describe('TraceIdUtil', () => {
  describe('generate', () => {
    it('should produce a trace ID in the canonical format', () => {
      const id = TraceIdUtil.generate('webhook-abc-123');
      expect(id).toMatch(/^wh-.+-oc-pending-ts-\d+$/);
    });

    it('should embed the provided webhook ID', () => {
      const id = TraceIdUtil.generate('my-delivery-id');
      expect(id).toContain('wh-my-delivery-id-oc-pending');
    });

    it('should generate a UUID when no webhook ID is provided', () => {
      const id = TraceIdUtil.generate();
      expect(id).toMatch(/^wh-[0-9a-f-]{36}-oc-pending-ts-\d+$/);
    });

    it('should use the current epoch millisecond timestamp', () => {
      const before = Date.now();
      const id = TraceIdUtil.generate('test');
      const after = Date.now();
      const parsed = TraceIdUtil.parse(id);
      expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
      expect(parsed.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('linkOnchain', () => {
    it('should replace `pending` with the real tx hash', () => {
      const pending = TraceIdUtil.generate('wh-001');
      const linked = TraceIdUtil.linkOnchain(pending, 'abc123txhash');
      expect(linked).toContain('-oc-abc123txhash-');
      expect(linked).not.toContain('pending');
    });

    it('should preserve the original webhook ID and timestamp', () => {
      const pending = TraceIdUtil.generate('wh-001');
      const linked = TraceIdUtil.linkOnchain(pending, 'somehash');
      const parsedPending = TraceIdUtil.parse(pending);
      const parsedLinked = TraceIdUtil.parse(linked);
      expect(parsedLinked.webhookId).toBe(parsedPending.webhookId);
      expect(parsedLinked.timestamp).toBe(parsedPending.timestamp);
    });
  });

  describe('parse', () => {
    it('should return null onchainTxHash for pending traces', () => {
      const pending = TraceIdUtil.generate('wh-xyz');
      const parsed = TraceIdUtil.parse(pending);
      expect(parsed.onchainTxHash).toBeNull();
    });

    it('should return the tx hash after linking', () => {
      const pending = TraceIdUtil.generate('wh-xyz');
      const linked = TraceIdUtil.linkOnchain(pending, 'deadbeef');
      const parsed = TraceIdUtil.parse(linked);
      expect(parsed.onchainTxHash).toBe('deadbeef');
    });

    it('should gracefully handle unrecognised trace IDs', () => {
      const parsed = TraceIdUtil.parse('garbage-id');
      expect(parsed.webhookId).toBe('garbage-id');
      expect(parsed.onchainTxHash).toBeNull();
      expect(parsed.timestamp).toBe(0);
    });
  });

  describe('isLinked', () => {
    it('should return false for a pending trace', () => {
      expect(TraceIdUtil.isLinked(TraceIdUtil.generate('x'))).toBe(false);
    });

    it('should return true after linking', () => {
      const linked = TraceIdUtil.linkOnchain(
        TraceIdUtil.generate('x'),
        'txhash99',
      );
      expect(TraceIdUtil.isLinked(linked)).toBe(true);
    });
  });
});
