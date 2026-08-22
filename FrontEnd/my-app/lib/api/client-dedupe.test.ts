import { describe, it, expect, vi } from 'vitest';
import { coalesceRequest } from './client';

describe('coalesceRequest', () => {
  it('coalesces concurrent calls with the same key into one execution', async () => {
    const run = vi.fn().mockResolvedValue('result');

    const [a, b] = await Promise.all([
      coalesceRequest('key-1', run),
      coalesceRequest('key-1', run),
    ]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(a).toBe('result');
    expect(b).toBe('result');
  });

  it('runs again once the previous call has settled', async () => {
    const run = vi.fn().mockResolvedValue('ok');

    await coalesceRequest('key-2', run);
    await coalesceRequest('key-2', run);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not coalesce calls with different keys', async () => {
    const run = vi.fn().mockResolvedValue('ok');

    await Promise.all([
      coalesceRequest('key-a', run),
      coalesceRequest('key-b', run),
    ]);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('clears the in-flight entry when the call rejects', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(coalesceRequest('key-3', failing)).rejects.toThrow('boom');

    const succeeding = vi.fn().mockResolvedValue('recovered');
    await expect(coalesceRequest('key-3', succeeding)).resolves.toBe(
      'recovered'
    );
    expect(succeeding).toHaveBeenCalledTimes(1);
  });
});
