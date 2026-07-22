import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Zod env schema validation for startup checks', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validateEnv returns valid when required vars are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3001');
    const { validateEnv } = await import('@/lib/config/env');
    const result = validateEnv();
    expect(result.valid).toBe(true);
  });

  it('validateEnv returns errors for invalid URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'not-a-url');
    const { validateEnv } = await import('@/lib/config/env');
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('env schema uses zod for validation', async () => {
    const { validateEnv } = await import('@/lib/config/env');
    const result = validateEnv();
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
  });
});
