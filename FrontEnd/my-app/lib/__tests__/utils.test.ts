// Unit tests for utility functions

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

describe('formatCurrency', () => {
  test('formats a whole dollar amount', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  test('formats a decimal amount', () => {
    expect(formatCurrency(9.99)).toBe('$9.99');
  });

  test('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('truncateAddress', () => {
  test('truncates a long address', () => {
    const addr = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    expect(truncateAddress(addr)).toBe('GABCDE...7890');
  });

  test('returns short address unchanged', () => {
    expect(truncateAddress('GABC')).toBe('GABC');
  });
});
