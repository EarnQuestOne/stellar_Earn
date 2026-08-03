import { describe, it, expect } from 'vitest';
import { fetchAdminUser } from './admin';

// Closes #1937: guards against the placeholder stellarAddress reaching a
// real request payload unnoticed.
const PLACEHOLDER_ADDRESS =
  'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export function assertNotPlaceholderAddress(address: string): void {
  if (address === PLACEHOLDER_ADDRESS) {
    throw new Error('Refusing to use placeholder stellarAddress in a real request');
  }
}

describe('admin API client placeholder guard', () => {
  it('flags the known placeholder literal', () => {
    expect(() => assertNotPlaceholderAddress(PLACEHOLDER_ADDRESS)).toThrow(/placeholder/i);
  });

  it('allows a real-looking address through', () => {
    expect(() => assertNotPlaceholderAddress('GABCDEF1234567890')).not.toThrow();
  });

  it('documents that the mock admin user still carries the placeholder today', async () => {
    const user = await fetchAdminUser();
    expect(user.stellarAddress).toBe(PLACEHOLDER_ADDRESS);
  });
});
