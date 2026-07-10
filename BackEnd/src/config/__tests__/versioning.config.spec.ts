import {
  API_SEMVER,
  API_VERSION_CONFIG,
  extractApiVersion,
  getApiSemver,
  isVersionDeprecated,
  isVersionSupported,
} from '../versioning.config';
import { Request } from 'express';

const mockRequest = (
  overrides: Partial<Request> & { headers?: Record<string, string> } = {},
): Request =>
  ({
    url: '',
    originalUrl: '',
    path: '',
    headers: {},
    ...overrides,
  }) as Request;

describe('versioning.config', () => {
  describe('extractApiVersion', () => {
    it('extracts version from /api/v1/ URI', () => {
      const req = mockRequest({ url: '/api/v1/health/live' });
      expect(extractApiVersion(req)).toBe('1');
    });

    it('extracts version from /v1/ URI', () => {
      const req = mockRequest({ originalUrl: '/v1/quests' });
      expect(extractApiVersion(req)).toBe('1');
    });

    it('extracts version from X-API-Version header', () => {
      const req = mockRequest({ headers: { 'x-api-version': '1' } });
      expect(extractApiVersion(req)).toBe('1');
    });

    it('extracts version from Accept-Version header', () => {
      const req = mockRequest({ headers: { 'accept-version': 'v1' } });
      expect(extractApiVersion(req)).toBe('1');
    });

    it('prefers URI version over header', () => {
      const req = mockRequest({
        url: '/api/v1/health',
        headers: { 'x-api-version': '2' },
      });
      expect(extractApiVersion(req)).toBe('1');
    });

    it('returns undefined when no version is present', () => {
      const req = mockRequest({ url: '/api/health/live' });
      expect(extractApiVersion(req)).toBeUndefined();
    });
  });

  describe('isVersionSupported', () => {
    it('accepts version 1', () => {
      expect(isVersionSupported('1')).toBe(true);
    });

    it('rejects unsupported versions', () => {
      expect(isVersionSupported('2')).toBe(false);
      expect(isVersionSupported('99')).toBe(false);
    });
  });

  describe('isVersionDeprecated', () => {
    it('returns false for the current active version', () => {
      expect(isVersionDeprecated(API_VERSION_CONFIG.defaultVersion)).toBe(false);
    });
  });

  describe('getApiSemver', () => {
    it('maps default version to API_SEMVER', () => {
      expect(getApiSemver('1')).toBe(API_SEMVER);
    });

    it('maps other major versions to major.0.0', () => {
      expect(getApiSemver('2')).toBe('2.0.0');
    });
  });
});
