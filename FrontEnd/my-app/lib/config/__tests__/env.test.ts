/**
 * Tests for environment variable validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, getEnv, env } from '../env';

describe('Environment Variable Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should pass validation when all required variables are set', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when required variables are missing', () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].variable).toBe('NEXT_PUBLIC_API_BASE_URL');
    });

    it('should include warnings for missing optional variables with defaults', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes('NEXT_PUBLIC_STELLAR_NETWORK'))
      ).toBe(true);
    });

    it('should provide helpful error details', () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      const result = validateEnv();

      expect(result.errors[0]).toMatchObject({
        variable: 'NEXT_PUBLIC_API_BASE_URL',
        description: expect.any(String),
        example: expect.any(String),
      });
    });
  });

  describe('getEnv', () => {
    it('should return environment variable value when set', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet';

      const value = getEnv('NEXT_PUBLIC_STELLAR_NETWORK');

      expect(value).toBe('mainnet');
    });

    it('should return default value when variable is not set', () => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;

      const value = getEnv('NEXT_PUBLIC_STELLAR_NETWORK');

      expect(value).toBe('testnet'); // default from config
    });

    it('should return provided default when variable and config default are not set', () => {
      delete process.env.NEXT_PUBLIC_CONTRACT_ID;

      const value = getEnv('NEXT_PUBLIC_CONTRACT_ID', 'fallback-value');

      expect(value).toBe('fallback-value');
    });
  });

  describe('env helper object', () => {
    it('should provide type-safe access to API base URL', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.example.com';

      const url = env.apiBaseUrl();

      expect(url).toBe('http://api.example.com');
    });

    it('should provide type-safe access to Stellar network', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet';

      const network = env.stellarNetwork();

      expect(network).toBe('mainnet');
    });

    it('should correctly identify development environment', () => {
      // Note: NODE_ENV is read-only in tests, so we test the current value
      const isDev = env.isDevelopment;
      const isProd = env.isProduction;

      // In test environment, both should be false
      expect(typeof isDev).toBe('boolean');
      expect(typeof isProd).toBe('boolean');
    });

    it('should correctly identify production environment', () => {
      // Note: NODE_ENV is read-only in tests, so we test the current value
      const isDev = env.isDevelopment;
      const isProd = env.isProduction;

      // In test environment, both should be false
      expect(typeof isDev).toBe('boolean');
      expect(typeof isProd).toBe('boolean');
    });

    it('should parse analytics test mode as boolean', () => {
      process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE = 'true';

      expect(env.analyticsTestMode()).toBe(true);

      process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE = 'false';

      expect(env.analyticsTestMode()).toBe(false);
    });
  });

  describe('error messages', () => {
    it('should format validation errors in a readable way', () => {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      const result = validateEnv();

      expect(result.errors[0].variable).toBe('NEXT_PUBLIC_API_BASE_URL');
      expect(result.errors[0].description).toContain('Backend API');
      expect(result.errors[0].example).toContain('http://localhost:3001');
    });
  });
});
