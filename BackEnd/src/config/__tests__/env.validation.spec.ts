import { validateEnv, assertEnvValid } from '../config/env.validation';

describe('Config module - env validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid when all required vars are set', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ACCESS_TOKEN_EXPIRATION = '15m';
    process.env.JWT_REFRESH_TOKEN_EXPIRATION = '7d';
    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error when DATABASE_URL is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ACCESS_TOKEN_EXPIRATION = '15m';
    process.env.JWT_REFRESH_TOKEN_EXPIRATION = '7d';
    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
  });

  it('assertEnvValid throws when env is invalid', () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    expect(() => assertEnvValid()).toThrow();
  });
});
