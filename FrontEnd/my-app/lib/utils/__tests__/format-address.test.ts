import { describe, it, expect } from 'vitest';
import { truncateAddress } from '@/lib/utils/format-address';

describe('truncateAddress', () => {
  it('truncates a Stellar contract ID (56 hex chars)', () => {
    const id = 'CBIELTK3Y7V5Y6V3Y7V5Y6V3Y7V5Y6V3Y7V5Y6V3Y7V5Y6V3Y7V5Y6V3Y7';
    expect(truncateAddress(id)).toBe('CBIELT…Y6V3Y7');
  });

  it('truncates a long Stellar address', () => {
    const addr = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    expect(truncateAddress(addr)).toBe('GABCDE…7890');
  });

  it('returns short strings unchanged', () => {
    expect(truncateAddress('GABC')).toBe('GABC');
    expect(truncateAddress('short')).toBe('short');
  });

  it('returns empty string for null/undefined', () => {
    expect(truncateAddress(null)).toBe('');
    expect(truncateAddress(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(truncateAddress('')).toBe('');
  });

  it('returns exactly maxTotal-length strings unchanged', () => {
    const exact = '123456789012'; // 12 chars
    expect(truncateAddress(exact)).toBe('123456789012');
  });

  it('truncates strings just over maxTotal length', () => {
    const over = '1234567890123'; // 13 chars
    expect(truncateAddress(over)).toBe('123456…8901');
  });

  it('respects custom prefix/suffix lengths', () => {
    const addr = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    expect(truncateAddress(addr, 4, 6)).toBe('GABC…567890');
  });

  it('respects custom maxTotal', () => {
    const addr = 'ABCDEFGHIJ'; // 10 chars
    expect(truncateAddress(addr, 4, 4, 8)).toBe('ABCD…GHIJ');
  });
});
